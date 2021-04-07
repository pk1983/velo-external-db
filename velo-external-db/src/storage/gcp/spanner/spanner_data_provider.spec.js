const {expect} = require('chai')
const DataProvider = require('./spanner_data_provider')
const {SchemaProvider} = require('./spanner_schema_provider')
const { Uninitialized } = require('../../../../test/commons/test-commons');
const gen = require('../../../../test/drivers/gen');
const chance = new require('chance')();
const driver = require('../../../../test/drivers/sql_filter_transformer_test_support')
const resource = require('../../../../test/resources/spanner_resources')


describe.only('Cloud SQL Data Service', function() {
    this.timeout(5000)

    const givenCollectionWith = async (entities, forCollection) => {
        await Promise.all( entities.map(e => env.dataProvider.insert(forCollection, e) ))
    }

    it('search with empty filter and order by and no data', async () => {
        driver.stubEmptyFilterFor(ctx.filter)
        driver.stubEmptyOrderByFor(ctx.sort)

        const res = await env.dataProvider.find(ctx.collectionName, ctx.filter, ctx.sort, ctx.skip, ctx.limit)

        expect( res ).to.be.deep.eql([]);
    });

    it('search with non empty filter will return data', async () => {
        await givenCollectionWith([ctx.entity, ctx.anotherEntity], ctx.collectionName)
        driver.givenFilterByIdWith(ctx.entity._id, ctx.filter)
        driver.stubEmptyOrderByFor(ctx.sort)

        const res = await env.dataProvider.find(ctx.collectionName, ctx.filter, ctx.sort, ctx.skip, ctx.limit)

        expect( res ).to.have.same.deep.members([ctx.entity]);
    });

    it('search with non empty order by will return sorted data', async () => {
        await givenCollectionWith([ctx.entity, ctx.anotherEntity], ctx.collectionName)
        driver.stubEmptyFilterFor(ctx.filter)
        driver.givenOrderByFor('_owner', ctx.sort)

        const res = await env.dataProvider.find(ctx.collectionName, ctx.filter, ctx.sort, ctx.skip, ctx.limit)

        expect( res ).to.be.deep.eql([ctx.anotherEntity, ctx.entity].sort((a, b) => (a._owner > b._owner) ? 1 : -1));
    });

    it('search with empty order and filter but with limit and skip', async () => {
        await givenCollectionWith([ctx.entity, ctx.anotherEntity], ctx.collectionName)
        driver.stubEmptyFilterFor(ctx.filter)
        driver.givenOrderByFor('_owner', ctx.sort)

        const res = await env.dataProvider.find(ctx.collectionName, ctx.filter, ctx.sort, 1, 1)

        expect( res ).to.be.deep.eql([ctx.anotherEntity, ctx.entity].sort((a, b) => (a._owner < b._owner) ? 1 : -1).slice(0, 1));
    });

    it('count will run query', async () => {
        await givenCollectionWith(ctx.entities, ctx.collectionName)
        driver.stubEmptyFilterFor(ctx.filter)

        const res = await env.dataProvider.count(ctx.collectionName, ctx.filter)

        expect( res ).to.be.eql(ctx.entities.length);
    });

    it('count will run query with filter', async () => {
        await givenCollectionWith([ctx.entity, ctx.anotherEntity], ctx.collectionName)
        driver.givenFilterByIdWith(ctx.entity._id, ctx.filter)

        const res = await env.dataProvider.count(ctx.collectionName, ctx.filter)

        expect( res ).to.be.eql(1);
    });

    it('bulk insert data into collection name and query all of it', async () => {
        driver.stubEmptyFilterAndSortFor('', '')

        await env.dataProvider.insert(ctx.collectionName, ctx.entity)
        // expect( await env.dataProvider.insert(ctx.collectionName, ctx.entity) ).to.be.eql(1)

        expect( await env.dataProvider.find(ctx.collectionName, '', '', 0, 50) ).to.be.deep.eql([ctx.entity]);
    });

    it('delete data from collection', async () => {
        await givenCollectionWith(ctx.entities, ctx.collectionName)
        driver.stubEmptyFilterAndSortFor('', '')

        await env.dataProvider.delete(ctx.collectionName, ctx.entities.map(e => e._id))

        expect( await env.dataProvider.find(ctx.collectionName, '', '', 0, 50) ).to.be.deep.eql([]);
    });

    it('allow update for entity', async () => {
        await givenCollectionWith([ctx.entity], ctx.collectionName)
        driver.stubEmptyFilterFor('')
        driver.stubEmptyOrderByFor('')

        await env.dataProvider.update(ctx.collectionName, ctx.modifiedEntity)

        expect( await env.dataProvider.find(ctx.collectionName, '', '', 0, 50) ).to.be.deep.eql([ctx.modifiedEntity]);
    });

    it('if update does not have and updatable fields, do nothing', async () => {
        await givenCollectionWith([ctx.entity], ctx.collectionName)
        driver.stubEmptyFilterFor('')
        driver.stubEmptyOrderByFor('')
        delete ctx.modifiedEntity[ctx.column.name]

        env.dataProvider.update(ctx.collectionName, ctx.modifiedEntity)

        expect( await env.dataProvider.find(ctx.collectionName, '', '', 0, 50) ).to.be.deep.eql([ctx.entity]);
    });



    const ctx = {
        collectionName: Uninitialized,
        filter: Uninitialized,
        sort: Uninitialized,
        skip: Uninitialized,
        limit: Uninitialized,
        column: Uninitialized,
        entity: Uninitialized,
        modifiedEntity: Uninitialized,
        anotherEntity: Uninitialized,
        entities: Uninitialized,
    };

    const env = {
        dataProvider: Uninitialized,
        schemaProvider: Uninitialized,
        connectionPool: Uninitialized,
    };

    beforeEach(async () => {
        ctx.collectionName = gen.randomCollectionName()
        ctx.column = gen.randomColumn()
        ctx.column.type = 'STRING(256)'

        ctx.filter = chance.word();
        ctx.sort = chance.word();
        ctx.skip = 0;
        ctx.limit = 10;

        ctx.entity = gen.randomDbEntity([ctx.column.name]);
        ctx.modifiedEntity = Object.assign({}, ctx.entity, {[ctx.column.name]: chance.word()} )
        ctx.anotherEntity = gen.randomDbEntity([ctx.column.name]);
        ctx.entities = gen.randomDbEntities([ctx.column.name]);

        await env.schemaProvider.create(ctx.collectionName, [ctx.column])
    });

    before(async function() {
        const projectId = 'test-project'
        const instanceId = 'test-instance'
        const databaseId = 'test-database'

        await resource.initSpannerEnv()

        env.dataProvider = new DataProvider(projectId, instanceId, databaseId, driver.filterParser)
        env.schemaProvider = new SchemaProvider(projectId, instanceId, databaseId)
    });

    after(async () => {
        await resource.shutSpannerEnv()
    });
})
