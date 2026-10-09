// src/controllers/client.controller.js

const clientService = require('../services/client.service');
const { createClientSchema, updateClientSchema, clientQuerySchema } = require('../validations/client.validation');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseFormatter');

const listClients = async (req, res, next) => {
  try {
    const parsed = clientQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 'Parámetros inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const { clients, total } = await clientService.listClients(parsed.data);
    return sendPaginated(res, clients, total, parsed.data.page, parsed.data.limit);
  } catch (error) {
    return next(error);
  }
};

const getClient = async (req, res, next) => {
  try {
    const client = await clientService.getClientById(req.params.id);
    if (!client) return sendError(res, 'Cliente no encontrado', 404);
    return sendSuccess(res, client);
  } catch (error) {
    return next(error);
  }
};

const createClient = async (req, res, next) => {
  try {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Datos inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const client = await clientService.createClient(parsed.data);
    return sendSuccess(res, client, 'Cliente creado exitosamente', 201);
  } catch (error) {
    return next(error);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const parsed = updateClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Datos inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const client = await clientService.updateClient(req.params.id, parsed.data);
    if (!client) return sendError(res, 'Cliente no encontrado', 404);
    return sendSuccess(res, client, 'Cliente actualizado');
  } catch (error) {
    return next(error);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    await clientService.deleteClient(req.params.id);
    return sendSuccess(res, null, 'Cliente desactivado');
  } catch (error) {
    return next(error);
  }
};

module.exports = { listClients, getClient, createClient, updateClient, deleteClient };
