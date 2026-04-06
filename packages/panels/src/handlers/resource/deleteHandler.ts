import type { AppRequest, AppResponse } from '@rudderjs/core'
import type { Resource } from '../../Resource.js'
import type { Action } from '../../schema/Action.js'
import type { ModelClass, RecordRow } from '../../types.js'
import { buildContext, liveBroadcast } from '../utils.js'

export function handleDelete(
  ResourceClass: typeof Resource,
  slug: string,
  Model: ModelClass<RecordRow>,
  isLive: boolean,
) {
  return async (req: AppRequest, res: AppResponse) => {
    const resource = new ResourceClass()
    const ctx      = buildContext(req)
    if (!await resource.policy('delete', ctx)) return res.status(403).json({ message: 'Forbidden.' })

    const id = (req.params as Record<string, string | undefined>)['id'] ?? ''
    const exists = await Model.find(id)
    if (!exists) return res.status(404).json({ message: 'Record not found.' })

    const softDeletes = resource._resolveTable().getConfig().softDeletes
    if (softDeletes) {
      await Model.query().update(id, { deletedAt: new Date() })
    } else {
      await Model.query().delete(id)
    }
    if (isLive) liveBroadcast(slug, 'record.deleted', { id })
    return res.json({ message: 'Deleted successfully.' })
  }
}

export function handleBulkDelete(
  ResourceClass: typeof Resource,
  slug: string,
  Model: ModelClass<RecordRow>,
  isLive: boolean,
) {
  return async (req: AppRequest, res: AppResponse) => {
    const resource = new ResourceClass()
    const ctx      = buildContext(req)
    if (!await resource.policy('delete', ctx)) return res.status(403).json({ message: 'Forbidden.' })

    const { ids } = req.body as { ids?: string[] }
    if (!ids?.length) return res.status(422).json({ message: 'No records selected.' })

    const softDeletes = resource._resolveTable().getConfig().softDeletes
    let deleted = 0
    for (const id of ids) {
      const exists = await Model.find(id)
      if (exists) {
        if (softDeletes) {
          await Model.query().update(id, { deletedAt: new Date() })
        } else {
          await Model.query().delete(id)
        }
        deleted++
      }
    }

    if (isLive) liveBroadcast(slug, 'records.deleted', { ids, deleted })
    return res.json({ message: `${deleted} records deleted.`, deleted })
  }
}

export function handleAction(
  ResourceClass: typeof Resource,
  slug: string,
  Model: ModelClass<RecordRow> | undefined,
  isLive: boolean,
) {
  return async (req: AppRequest, res: AppResponse) => {
    const resource = new ResourceClass()
    const ctx      = buildContext(req)
    if (!await resource.policy('update', ctx)) return res.status(403).json({ message: 'Forbidden.' })

    const actionName = (req.params as Record<string, string | undefined>)['action'] ?? ''
    const tableActions = resource._resolveTable().getConfig().actions
    const action       = tableActions.find((a: Action) => a.getName() === actionName)
    if (!action) return res.status(404).json({ message: `Action "${actionName}" not found.` })

    const { ids, formData } = req.body as { ids?: string[]; formData?: Record<string, unknown> }
    if (!ids?.length) return res.status(422).json({ message: 'No records selected.' })

    const records: unknown[] = []
    if (Model) {
      for (const id of ids) {
        const record = await Model.find(id)
        if (record) records.push(record)
      }
    }

    await action.execute(records, formData)
    if (isLive) liveBroadcast(slug, 'action.executed', { action: actionName, ids })
    return res.json({ message: 'Action executed successfully.' })
  }
}

export function handleRestore(
  ResourceClass: typeof Resource,
  slug: string,
  Model: ModelClass<RecordRow>,
  isLive: boolean,
) {
  return async (req: AppRequest, res: AppResponse) => {
    const resource = new ResourceClass()
    const ctx      = buildContext(req)
    if (!await resource.policy('restore', ctx)) return res.status(403).json({ message: 'Forbidden.' })

    const id = (req.params as Record<string, string | undefined>)['id'] ?? ''
    const exists = await Model.find(id)
    if (!exists) return res.status(404).json({ message: 'Record not found.' })

    await Model.query().update(id, { deletedAt: null })
    if (isLive) liveBroadcast(slug, 'record.restored', { id })
    return res.json({ message: 'Record restored.' })
  }
}

export function handleForceDelete(
  ResourceClass: typeof Resource,
  slug: string,
  Model: ModelClass<RecordRow>,
  isLive: boolean,
) {
  return async (req: AppRequest, res: AppResponse) => {
    const resource = new ResourceClass()
    const ctx      = buildContext(req)
    if (!await resource.policy('forceDelete', ctx)) return res.status(403).json({ message: 'Forbidden.' })

    const id = (req.params as Record<string, string | undefined>)['id'] ?? ''
    const exists = await Model.find(id)
    if (!exists) return res.status(404).json({ message: 'Record not found.' })

    await Model.query().delete(id)
    if (isLive) liveBroadcast(slug, 'record.forceDeleted', { id })
    return res.json({ message: 'Permanently deleted.' })
  }
}

export function handleBulkRestore(
  ResourceClass: typeof Resource,
  slug: string,
  Model: ModelClass<RecordRow>,
  isLive: boolean,
) {
  return async (req: AppRequest, res: AppResponse) => {
    const resource = new ResourceClass()
    const ctx      = buildContext(req)
    if (!await resource.policy('restore', ctx)) return res.status(403).json({ message: 'Forbidden.' })

    const { ids } = req.body as { ids?: string[] }
    if (!ids?.length) return res.status(422).json({ message: 'No records selected.' })

    let restored = 0
    for (const id of ids) {
      const exists = await Model.find(id)
      if (exists) {
        await Model.query().update(id, { deletedAt: null })
        restored++
      }
    }

    if (isLive) liveBroadcast(slug, 'records.restored', { ids, restored })
    return res.json({ message: `${restored} records restored.`, restored })
  }
}

export function handleBulkForceDelete(
  ResourceClass: typeof Resource,
  slug: string,
  Model: ModelClass<RecordRow>,
  isLive: boolean,
) {
  return async (req: AppRequest, res: AppResponse) => {
    const resource = new ResourceClass()
    const ctx      = buildContext(req)
    if (!await resource.policy('forceDelete', ctx)) return res.status(403).json({ message: 'Forbidden.' })

    const { ids } = req.body as { ids?: string[] }
    if (!ids?.length) return res.status(422).json({ message: 'No records selected.' })

    let deleted = 0
    for (const id of ids) {
      const exists = await Model.find(id)
      if (exists) {
        await Model.query().delete(id)
        deleted++
      }
    }

    if (isLive) liveBroadcast(slug, 'records.forceDeleted', { ids, deleted })
    return res.json({ message: `${deleted} records permanently deleted.`, deleted })
  }
}
