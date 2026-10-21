// src/controllers/client.controller.js

const clientService = require('../services/client.service');
const {
  createClientSchema,
  updateClientSchema,
  mobileUpdateClientSchema,
  clientQuerySchema,
  bulkClientsSchema,
} = require('../validations/client.validation');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseFormatter');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const bulkClients = async (req, res, next) => {
  try {
    const parsed = bulkClientsSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Datos inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const summary = await clientService.bulkProcessClients(parsed.data.rows);
    return sendSuccess(res, summary, 'Carga masiva procesada');
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/mobile/clients
 * Lista optimizada de clientes con historial resumido para la app móvil
 */
const mobileListClients = async (req, res, next) => {
  try {
    const clients = await clientService.listClientsForMobile();
    return sendSuccess(res, clients, 'Clientes descargados');
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH & PUT /api/v1/mobile/clients/:id
 * Actualización parcial de clientes desde el formulario de checkout móvil (vendedor o admin)
 */
const mobileUpdateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      return sendError(res, 'ID de cliente inválido', 400);
    }

    const parsed = mobileUpdateClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Datos de cliente inválidos', 400, parsed.error.flatten().fieldErrors);
    }

    const existingClient = await clientService.getClientById(id);
    if (!existingClient) {
      return sendError(res, 'Cliente no encontrado', 404);
    }

    const updatedClient = await clientService.updateClient(id, parsed.data);
    return sendSuccess(res, updatedClient, 'Cliente actualizado exitosamente');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  bulkClients,
  mobileListClients,
  mobileUpdateClient,
};
