import CrmSchemaApply from './apply.js'

export default class CrmSchemaPlan extends CrmSchemaApply {
  static description =
    'Compare a data model document with the workspace and list every change (create, update, switch off, restore, blocked, destructive) without writing anything (crm:read)'

  static examples = [
    '<%= config.bin %> crm schema plan --file data-model.json --json',
    '<%= config.bin %> crm schema plan --file data-model.json --prune --json',
  ]

  protected forceCheck = true
}
