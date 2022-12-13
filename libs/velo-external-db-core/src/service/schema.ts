import { errors } from '@wix-velo/velo-external-db-commons'
import { ISchemaProvider, SchemaOperations, ResponseField, DbCapabilities } from '@wix-velo/velo-external-db-types'
import { Collection, CollectionCapabilities, CollectionOperation, CreateCollectionResponse, DataOperation, DeleteCollectionResponse, Field, FieldCapabilities, FieldType, ListCollectionsResponsePart, UpdateCollectionResponse } from '../spi-model/collection'
import { convertQueriesToQueryOperatorsEnum, convertFieldTypeToEnum, convertWixFormatFieldsToInputFields, convertResponseFieldToWixFormat, compareColumnsInDbAndRequest } from '../utils/schema_utils'
import CacheableSchemaInformation from './schema_information'
const { Create, AddColumn, RemoveColumn, ChangeColumnType } = SchemaOperations

export default class SchemaService {
    storage: ISchemaProvider
    schemaInformation: CacheableSchemaInformation
    constructor(storage: any, schemaInformation: any) {
        this.storage = storage
        this.schemaInformation = schemaInformation
    }

    async list(collectionIds: string[]): Promise<ListCollectionsResponsePart> {
        
        // remove in the end of development
        if (!this.storage.capabilities || !this.storage.columnCapabilitiesFor) {
            throw new Error('Your storage does not support the new collection capabilities API')
        }
        
        const collections = (!collectionIds || collectionIds.length === 0) ? 
            await this.storage.list() : 
            await Promise.all(collectionIds.map(async(collectionName: string) => ({ id: collectionName, fields: await this.schemaInformation.schemaFieldsFor(collectionName) })))
                
        const capabilities = this.formatCollectionCapabilities(this.storage.capabilities())
        return { 
            collection: collections.map((collection) => ({
                id: collection.id,
                fields: this.formatFields(collection.fields),
                capabilities
            }))
        }
    }

    async create(collection: Collection): Promise<CreateCollectionResponse> {                
        await this.storage.create(collection.id, convertWixFormatFieldsToInputFields(collection.fields))
        await this.schemaInformation.refresh()
        return { collection }
    }

    async update(collection: Collection): Promise<UpdateCollectionResponse> {
        await this.validateOperation(Create)
        
        // remove in the end of development
        if (!this.storage.changeColumnType) {
            throw new Error('Your storage does not support the new collection capabilities API')
        }

        const collectionColumnsInRequest = collection.fields
        const collectionColumnsInDb = await this.storage.describeCollection(collection.id)

        const {
            columnsToAdd,
            columnsToRemove,
            columnsToChangeType
        } = compareColumnsInDbAndRequest(collectionColumnsInDb, collectionColumnsInRequest)

        // Adding columns
        if (columnsToAdd.length > 0) {
            await this.validateOperation(AddColumn)
        }
        await Promise.all(columnsToAdd.map(async(field) => await this.storage.addColumn(collection.id, field)))
        
        // Removing columns
        if (columnsToRemove.length > 0) {
            await this.validateOperation(RemoveColumn)
        }
        await Promise.all(columnsToRemove.map(async(fieldName) => await this.storage.removeColumn(collection.id, fieldName)))

        // Changing columns type
        if (columnsToChangeType.length > 0) {
            await this.validateOperation(ChangeColumnType)
        }
        await Promise.all(columnsToChangeType.map(async(field) => await this.storage.changeColumnType!(collection.id, field)))

        await this.schemaInformation.refresh()

        return { collection }
    }

    async delete(collectionId: string): Promise<DeleteCollectionResponse> {
        const collectionFields = await this.storage.describeCollection(collectionId)
        await this.storage.drop(collectionId)
        await this.schemaInformation.refresh()
        return { collection: {
            id: collectionId,
            fields: convertResponseFieldToWixFormat(collectionFields),
        } }
    }

    private async validateOperation(operationName: SchemaOperations) {
        const allowedSchemaOperations = this.storage.supportedOperations()

        if (!allowedSchemaOperations.includes(operationName)) 
            throw new errors.UnsupportedOperation(`Your database doesn't support ${operationName} operation`)
    }

    private formatFields(fields: ResponseField[]): Field[] {
        const fieldCapabilitiesFor = (type: string): FieldCapabilities => {
            // remove in the end of development
            if (!this.storage.columnCapabilitiesFor) {
                throw new Error('Your storage does not support the new collection capabilities API')
            }
            const { sortable, columnQueryOperators } = this.storage.columnCapabilitiesFor(type)
            return {
                sortable,
                queryOperators: convertQueriesToQueryOperatorsEnum(columnQueryOperators)
            }
        }

        return fields.map((f) => ({
            key: f.field,
            // TODO: think about how to implement this
            encrypted: false,
            type: convertFieldTypeToEnum(f.type),
            capabilities: fieldCapabilitiesFor(f.type)
        }))
    }

    private formatCollectionCapabilities(capabilities: DbCapabilities): CollectionCapabilities {
        return {
            dataOperations: capabilities.dataOperations as unknown as DataOperation[],
            fieldTypes: capabilities.fieldTypes as unknown as FieldType[],
            collectionOperations: capabilities.collectionOperations as unknown as CollectionOperation[],
        }
    }

}
