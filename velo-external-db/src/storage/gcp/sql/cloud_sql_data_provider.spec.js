const {expect} = require('chai')
const DataProvider = require('./cloud_sql_data_provider')
const {SchemaProvider, SystemFields} = require('./cloud_sql_schema_provider')
const { Uninitialized } = require('../../../../test/commons/test-commons');
const { randomEntities, randomEntity } = require('../../../../test/drivers/gen');
const chance = new require('chance')();
const mysqlSetup = require('@databases/mysql-test/jest/globalSetup')
const mysqlTeardown = require('@databases/mysql-test/jest/globalTeardown')
const mysql      = require('mysql2');



describe('Cloud SQL Service', () => {

    describe('Schema API', () => {
        it('list of empty db will result with an empty array', async () => {
            const db = await env.schemaProvider.list()
            expect(db).to.be.deep.eql([])
        })

        it('create collection with default columns', async () => {
            await env.schemaProvider.create(ctx.collectionName)

            const db = await env.schemaProvider.list()
            expect(db).to.be.deep.eql([{ id: ctx.collectionName,
                                         fields: [{name: '_id', type: 'varchar(256)', isPrimary: true},
                                                  {name: '_createdDate', type: 'timestamp', isPrimary: false},
                                                  {name: '_updatedDate', type: 'timestamp', isPrimary: false},
                                                  {name: '_owner', type: 'varchar(256)', isPrimary: false},
                                                  // {name: 'title', type: 'varchar(20)', isPrimary: false},
                                                 ]
                                     }])
        })

        it('create collection twice will do nothing', async () => {
            await env.schemaProvider.create(ctx.collectionName, [])
            await env.schemaProvider.create(ctx.collectionName, [])
        })

        it('add column on a non existing collection will fail', async () => {
            await env.schemaProvider.addColumn(ctx.collectionName, {name: ctx.columnName, type: 'datetime'})
        })

        it('add column on a an existing collection', async () => {
            await env.schemaProvider.create(ctx.collectionName, [])

            await env.schemaProvider.addColumn(ctx.collectionName, {name: ctx.columnName, type: 'datetime'})

            expect((await env.schemaProvider.list()).find(e => e.id === ctx.collectionName)
                                                    .fields.find(e => e.name === ctx.columnName)).to.be.deep.eql({name: ctx.columnName, type: 'datetime', isPrimary: false})
        })

        it('add duplicate column will fail', async () => {
            await env.schemaProvider.create(ctx.collectionName, [])

            await env.schemaProvider.addColumn(ctx.collectionName, {name: ctx.columnName, type: 'datetime'})
            await env.schemaProvider.addColumn(ctx.collectionName, {name: ctx.columnName, type: 'datetime'})
        })

        it('add system column will fail', async () => {
            await env.schemaProvider.create(ctx.collectionName, [])

            SystemFields.map(f => f.name)
                        .map(async f => {
                            await env.schemaProvider.addColumn(ctx.collectionName, {name: f, type: 'datetime'})
                        })
        })

        it('drop column on a an existing collection', async () => {
            await env.schemaProvider.create(ctx.collectionName, [])
            await env.schemaProvider.addColumn(ctx.collectionName, {name: ctx.columnName, type: 'datetime'})

            await env.schemaProvider.removeColumn(ctx.collectionName, ctx.columnName)

            expect((await env.schemaProvider.list()).find(e => e.id === ctx.collectionName)
                                                    .fields.find(e => e.name === ctx.columnName)).to.be.an('undefined')
        })

        it('drop column on a a non existing collection', async () => {
            await env.schemaProvider.create(ctx.collectionName, [])

            await env.schemaProvider.removeColumn(ctx.collectionName, ctx.columnName)
        })

        it('drop system column will fail', async () => {
            await env.schemaProvider.create(ctx.collectionName, [])


            SystemFields.map(f => f.name)
                        .map(async f => {
                            await env.schemaProvider.removeColumn(ctx.collectionName, f)
                        })
        })
    })

    describe('Query API', () => {

        it('search with empty filter and order by and no data', async () => {
            await env.schemaProvider.create(ctx.collectionName, [])

            const res = await env.dataProvider.find(ctx.collectionName, ctx.filter, ctx.sort, ctx.skip, ctx.limit)

            expect( res ).to.be.deep.eql([]);
        });

        it('bulk insert data into collection name and query all of it', async () => {
            await env.schemaProvider.create(ctx.collectionName, [])

            expect( await env.dataProvider.insert(ctx.collectionName, ctx.entity) ).to.be.eql(1)

            expect( await env.dataProvider.find(ctx.collectionName, '', '', 0, 50) ).to.be.deep.eql([ctx.entity]);
        });

        it('delete data from collection', async () => {
            await env.schemaProvider.create(ctx.collectionName, [])
            await Promise.all( ctx.entities.map(e => env.dataProvider.insert(ctx.collectionName, e) ))

            expect( await env.dataProvider.delete(ctx.collectionName, ctx.entities.map(e => e._id)) ).to.be.eql(ctx.entities.length)

            expect( await env.dataProvider.find(ctx.collectionName, '', '', 0, 50) ).to.be.deep.eql([]);
        });
    })

    const ctx = {
        collectionName: Uninitialized,
        filter: Uninitialized,
        sort: Uninitialized,
        skip: Uninitialized,
        limit: Uninitialized,
        columnName: Uninitialized,
        entity: Uninitialized,
        entities: Uninitialized,
    };

    const env = {
        dataProvider: Uninitialized,
        schemaProvider: Uninitialized,
        connectionPool: Uninitialized,
    };

    beforeEach(() => {
        ctx.collectionName = chance.word();
        ctx.filter = chance.word();
        ctx.sort = chance.word();
        ctx.skip = chance.word();
        ctx.limit = chance.word();
        ctx.columnName = chance.word();

        ctx.entity = randomEntity([]);
        ctx.entities = randomEntities();

    });

    before(async function() {
        this.timeout(20000)
        await mysqlSetup()/*.then(() => {*/
        env.connectionPool = mysql.createPool({
            host     : 'localhost',
            user     : 'test-user',
            password : 'password',
            database : 'test-db',
            waitForConnections: true,
            namedPlaceholders: true,
            // debug: true,
            // trace: true,
            connectionLimit: 10,
            queueLimit: 0/*,
            multipleStatements: true*/
        }).promise();

        env.dataProvider = new DataProvider(env.connectionPool)
        env.schemaProvider = new SchemaProvider(env.connectionPool)
    });

    after(async () => {
        await mysqlTeardown();
    });




})
