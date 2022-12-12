import { SystemFields } from '@wix-velo/velo-external-db-commons'
import { Uninitialized, gen as genCommon, testIfSupportedOperationsIncludes, streamToArray } from '@wix-velo/test-commons'
import { SchemaOperations } from '@wix-velo/velo-external-db-types'
const { RemoveColumn } = SchemaOperations
import * as schema from '../drivers/schema_api_rest_test_support'
import * as matchers from '../drivers/schema_api_rest_matchers'
import { authOwner } from '@wix-velo/external-db-testkit'
import * as gen from '../gen'
import Chance = require('chance')
import axios from 'axios'
import { initApp, teardownApp, dbTeardown, setupDb, currentDbImplementationName, supportedOperations } from '../resources/e2e_resources'
const chance = Chance()

const axiosClient = axios.create({
    baseURL: 'http://localhost:8080'
})

describe(`Schema REST API: ${currentDbImplementationName()}`,  () => {
    beforeAll(async() => {
        await setupDb()

        await initApp()
    }, 20000)

    afterAll(async() => {
        await dbTeardown()
    }, 20000)
    
    describe('Velo External DB Collections REST API',  () => {
        beforeEach(async() => {
            await schema.deleteAllCollections(authOwner)
        })

        test('collection get', async() => {
            await schema.givenCollection(ctx.collectionName, [], authOwner)

            await expect(schema.retrieveSchemaFor(ctx.collectionName, authOwner)).resolves.toEqual(matchers.collectionResponsesWith(ctx.collectionName, []))
        })

        test('collection create', async() => {        
            const collection = {
                id: ctx.collectionName,
                fields: []
            }
            await axiosClient.post('/collections/create', { collection }, { ...authOwner, responseType: 'stream' })

            await expect(schema.retrieveSchemaFor(ctx.collectionName, authOwner)).resolves.toEqual(matchers.createCollectionResponse(ctx.collectionName, [...SystemFields]))
        })

        test('collection update - add column', async() => {
            await schema.givenCollection(ctx.collectionName, [], authOwner)

            const collectionGetStream = await axiosClient.post('/collections/get', { collectionIds: [ctx.collectionName] }, { ...authOwner, responseType: 'stream' })
            const [collectionGetRes] = await streamToArray(collectionGetStream.data) as any[]

            collectionGetRes.fields.push({
                key: ctx.column.name,
                type: 0
            })
        
            const collectionUpdateStream = await axiosClient.post('/collections/update', { collection: collectionGetRes }, { ...authOwner, responseType: 'stream' })
            const [collectionUpdateRes] = await streamToArray(collectionUpdateStream.data) as any[]

            expect(collectionUpdateRes).toEqual(matchers.collectionResponsesWith(ctx.collectionName, []))
        })

        testIfSupportedOperationsIncludes(supportedOperations, [ RemoveColumn ])('collection update - remove column', async() => {
            await schema.givenCollection(ctx.collectionName, [ctx.column], authOwner)

            const collectionGetStream = await axiosClient.post('/collections/get', { collectionIds: [ctx.collectionName] }, { ...authOwner, responseType: 'stream' })
            const [collectionGetRes] = await streamToArray(collectionGetStream.data) as any[]

            const systemFieldsNames = SystemFields.map(f => f.name)
            collectionGetRes.fields = collectionGetRes.fields.filter((f: any) => systemFieldsNames.includes(f.key))

            const collectionUpdateStream = await axiosClient.post('/collections/update', { collection: collectionGetRes }, { ...authOwner, responseType: 'stream' })
            const [collectionUpdateRes] = await streamToArray(collectionUpdateStream.data) as any[]            
            
            expect(collectionUpdateRes).toEqual(matchers.collectionResponsesWith(ctx.collectionName, []))

        })

        test('collection delete', async() => {
            await schema.givenCollection(ctx.collectionName, [], authOwner)
            await axiosClient.post('/collections/delete', { collectionId: ctx.collectionName }, { ...authOwner, responseType: 'stream' })
            await expect(schema.retrieveSchemaFor(ctx.collectionName, authOwner)).rejects.toThrow('404')
        })
    })

    const ctx = {
        collectionName: Uninitialized,
        column: Uninitialized,
        numberColumns: Uninitialized,
        item: Uninitialized,
        items: Uninitialized,
        modifiedItem: Uninitialized,
        modifiedItems: Uninitialized,
        anotherItem: Uninitialized,
        numberItem: Uninitialized,
        anotherNumberItem: Uninitialized,
    }

    afterAll(async() => await teardownApp())

    beforeEach(async() => {
        ctx.collectionName = gen.randomCollectionName()
        ctx.column = gen.randomColumn()
        ctx.numberColumns = gen.randomNumberColumns()
        ctx.item = genCommon.randomEntity([ctx.column.name])
        ctx.items = Array.from({ length: 10 }, () => genCommon.randomEntity([ctx.column.name]))
        ctx.modifiedItems = ctx.items.map(i => ( { ...i, [ctx.column.name]: chance.word() } ) )
        ctx.modifiedItem = { ...ctx.item, [ctx.column.name]: chance.word() }
        ctx.anotherItem = genCommon.randomEntity([ctx.column.name])
        ctx.numberItem = gen.randomNumberDbEntity(ctx.numberColumns)
        ctx.anotherNumberItem = gen.randomNumberDbEntity(ctx.numberColumns)
    })

})
