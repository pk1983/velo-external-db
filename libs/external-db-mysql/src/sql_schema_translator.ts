import { InputField, FieldType, FieldSubType } from '@wix-velo/velo-external-db-types'
import { escapeId } from './mysql_utils'

export interface IMySqlSchemaColumnTranslator {
    translateType(dbType: string): { type: string, subtype?: string }
    dbTypeFor(field: InputField): string
    columnToDbColumnSql(field: InputField): string
}

export default class SchemaColumnTranslator implements IMySqlSchemaColumnTranslator {
    constructor() {
    }

    translateType(dbType: string) {
        const type = dbType.toLowerCase()
            .split('(')
            .shift()

        switch (type) {
            case 'int':
            case 'integer':
            case 'bigint':
            case 'smallint':
                return { type: FieldType.number, subtype: FieldSubType.int }
            
            case 'float':
            case 'double':
            case 'decimal':
                return { type: FieldType.number, subtype: FieldSubType.float }

            case 'date':
            case 'datetime':
            case 'timestamp':
            case 'time':
            case 'year':
                return { type: FieldType.datetime }

            case 'varchar':
            case 'text':
            case 'mediumtext':
                return { type: FieldType.text }
            
            case 'longtext':
                return { type: FieldType.longText }

            case 'tinyint':
            case 'bit':
            case 'boolean':
            case 'bool':
                return { type: FieldType.boolean }

            case 'json':
                return { type: FieldType.object }

            default:
                console.log('Unknown type', type)
                return { type: FieldType.text, subtype: FieldSubType.unknownType }
        }
    }


    columnToDbColumnSql(f: InputField) {
        return `${escapeId(f.name)} ${this.dbTypeFor(f)}`
    }

    dbTypeFor(f: InputField) {
        return this.dbType(f.type, f.subtype, f.precision)
    }

    dbType(type: string, subtype: any, precision: any) {
        switch (`${type.toLowerCase()}_${(subtype || '').toLowerCase()}`) {
            case 'number_int':
                return 'INT'

            case 'number_bigint':
                return 'BIGINT'

            case 'number_float':
                return `FLOAT${this.parsePrecision(precision)}`

            case 'number_double':
                return `DOUBLE${this.parsePrecision(precision)}`

            case 'number_decimal':
                return `DECIMAL${this.parsePrecision(precision)}`

            case 'datetime_date':
                return 'DATE'

            case 'datetime_time':
                return 'TIME'

            case 'datetime_year':
                return 'YEAR'

            case 'datetime_datetime':
                return 'DATETIME'

            case 'datetime_timestamp':
                return 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'

            case 'text_string':
                return `VARCHAR${this.parseLength(precision)}`

            case 'text_small':
                return 'TEXT'

            case 'text_medium':
                return 'MEDIUMTEXT'

            case 'text_large':
                return 'LONGTEXT'

            case 'boolean_':
                return 'BOOLEAN'

            case 'object_':
                return 'JSON'

            default:
                throw new Error(`${type.toLowerCase()}_${(subtype || '').toLowerCase()}`)

        }
    }

    parsePrecision(precision: string) {
        try {
            const parsed = precision.split(',').map((s: string) => s.trim()).map((s: string) => parseInt(s))
            return `(${parsed.join(',')})`
        } catch (e) {
            return '(5,2)'
        }
    }

    parseLength(length: string) {
        try {
            const parsed = parseInt(length)
            if (isNaN(parsed) || parsed <= 0) {
                return '(2048)'
            }
            return `(${parsed})`
        } catch (e) {
            return '(2048)'
        }
    }

}
