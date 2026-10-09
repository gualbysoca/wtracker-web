// src/controllers/user.controller.js

const userService = require('../services/user.service');
const { createUserSchema, updateUserSchema, paginationSchema } = require('../validations/user.validation');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseFormatter');

const listUsers = async (req, res, next) => {
  try {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 'Parámetros de consulta inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const { users, total } = await userService.listUsers(parsed.data);
    return sendPaginated(res, users, total, parsed.data.page, parsed.data.limit, 'Usuarios obtenidos');
  } catch (error) {
    return next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return sendError(res, 'Usuario no encontrado', 404);
    return sendSuccess(res, user, 'Usuario obtenido');
  } catch (error) {
    return next(error);
  }
};

const getUserPerformance = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    const metrics = await userService.getUserPerformance(req.params.id, date_from, date_to);
    return sendSuccess(res, metrics, 'Métricas de rendimiento obtenidas');
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Datos inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    if (req.user.role === 'supervisor') {
      const mobileRoles = ['reponedor', 'vendedor', 'cobrador', 'repartidor'];
      if (!mobileRoles.includes(parsed.data.role)) {
        return sendError(res, 'Los supervisores solo pueden crear usuarios móviles', 403);
      }
    }

    const user = await userService.createUser(parsed.data);
    return sendSuccess(res, user, 'Usuario creado exitosamente', 201);
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Datos inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const targetUser = await userService.getUserById(req.params.id);
    if (!targetUser) return sendError(res, 'Usuario no encontrado', 404);

    if (req.user.role === 'supervisor') {
      const systemRoles = ['admin', 'supervisor'];
      if (systemRoles.includes(targetUser.role)) {
        return sendError(res, 'No tienes permisos para modificar este usuario', 403);
      }
      if (parsed.data.role && systemRoles.includes(parsed.data.role)) {
        return sendError(res, 'No tienes permisos para asignar este rol', 403);
      }
    }

    const user = await userService.updateUser(req.params.id, parsed.data);
    if (!user) return sendError(res, 'Usuario no encontrado', 404);
    return sendSuccess(res, user, 'Usuario actualizado');
  } catch (error) {
    return next(error);
  }
};

const deactivateUser = async (req, res, next) => {
  try {
    // Un admin no puede desactivarse a sí mismo
    if (req.params.id === req.user.id) {
      return sendError(res, 'No puedes desactivar tu propia cuenta', 400);
    }
    const targetUser = await userService.getUserById(req.params.id);
    if (!targetUser) return sendError(res, 'Usuario no encontrado', 404);

    if (req.user.role === 'supervisor') {
      const systemRoles = ['admin', 'supervisor'];
      if (systemRoles.includes(targetUser.role)) {
        return sendError(res, 'No tienes permisos para desactivar este usuario', 403);
      }
    }

    await userService.deactivateUser(req.params.id);
    return sendSuccess(res, null, 'Usuario desactivado');
  } catch (error) {
    return next(error);
  }
};

const toggleShift = async (req, res, next) => {
  try {
    const { is_on_shift } = req.body;
    if (typeof is_on_shift !== 'boolean') {
      return sendError(res, 'is_on_shift debe ser un valor booleano', 400);
    }
    const result = await userService.toggleShift(req.user.id, is_on_shift);
    return sendSuccess(res, result, is_on_shift ? 'Jornada iniciada' : 'Jornada finalizada');
  } catch (error) {
    return next(error);
  }
};

module.exports = { listUsers, getUser, getUserPerformance, createUser, updateUser, deactivateUser, toggleShift };
