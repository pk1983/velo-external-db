const moment = require('moment')
const { escapeId } = require('mysql')
const { promisify } = require('util')
const { SystemFields } = require('./mysql_schema_provider')
const { EMPTY_FILTER } = require('./sql_filter_transformer')
const translateErrorCodes = require('./sql_exception_translator')

class DataProvider {
    constructor(pool, filterParser) {
        this.filterParser = filterParser
        this.pool = pool

        this.query = promisify(this.pool.query).bind(this.pool)
    }

    async find(collectionName, filter, sort, skip, limit) {
        const {filterExpr, parameters} = this.filterParser.transform(filter)
        const {sortExpr} = this.filterParser.orderBy(sort)
        const sql = `SELECT * FROM ${escapeId(collectionName)} ${filterExpr} ${sortExpr} LIMIT ?, ?`
        const resultset = await this.query(sql, [...parameters, skip, limit])
                                    .catch( translateErrorCodes )
        return resultset
    }

    async count(collectionName, filter) {
        const {filterExpr, parameters} = this.filterParser.transform(filter)
        const sql = `SELECT COUNT(*) AS num FROM ${escapeId(collectionName)} ${filterExpr}`
        const resultset = await this.query(sql, parameters)
                                    .catch( translateErrorCodes )
        return resultset[0]['num']
    }

    // todo: check if we can get schema in a safer way. should be according to schema of the table
    async insert(collectionName, items) {
        const item = items[0]
        const sql = `INSERT INTO ${escapeId(collectionName)} (${Object.keys(item).map( escapeId ).join(', ')}) VALUES ?`
        
        const data = items.map(item => this.asParamArrays( this.patchDateTime(item) ) )
        const resultset = await this.query(sql, [data])
                                    .catch( translateErrorCodes )
        return resultset.affectedRows
    }

    async update(collectionName, items) {
        const item = items[0]
        const systemFieldNames = SystemFields.map(f => f.name)
        const updateFields = Object.keys(item).filter( k => !systemFieldNames.includes(k) )

        if (updateFields.length === 0) {
            return 0
        }

        const queries = items.map(() => `UPDATE ${escapeId(collectionName)} SET ${updateFields.map(f => `${escapeId(f)} = ?`).join(', ')} WHERE _id = ?` )
                             .join(';')
        const updatables = items.map(i => [...updateFields, '_id'].reduce((obj, key) => ({ ...obj, [key]: i[key] }), {}) )
                                .map(u => this.asParamArrays( this.patchDateTime(u) ))
        const resultset = await this.query(queries, [].concat(...updatables))
                                    .catch( translateErrorCodes )

        return Array.isArray(resultset) ? resultset.reduce((s, r) => s + r.changedRows, 0) : resultset.changedRows
    }

    async delete(collectionName, itemIds) {
        const sql = `DELETE FROM ${escapeId(collectionName)} WHERE _id IN (${this.wildCardWith(itemIds.length, '?')})`
        const rs = await this.query(sql, itemIds)
                             .catch( translateErrorCodes )
        return rs.affectedRows
    }

    async truncate(collectionName) {
        await this.query(`TRUNCATE ${escapeId(collectionName)}`).catch( translateErrorCodes )
    }

    async aggregate(collectionName, filter, aggregation) {
        const {filterExpr: whereFilterExpr, parameters: whereParameters} = this.filterParser.transform(filter)
        const {fieldsStatement, groupByColumns, havingFilter, parameters} = this.filterParser.parseAggregation(aggregation.processingStep, aggregation.postFilteringStep)

        const sql = `SELECT ${fieldsStatement} FROM ${escapeId(collectionName)} ${whereFilterExpr} GROUP BY ${groupByColumns.map( escapeId ).join(', ')} ${havingFilter}`
        const resultset = await this.query(sql, [...whereParameters, ...parameters])
                                    .catch( translateErrorCodes )
        return resultset
    }

    wildCardWith(n, char) {
        return Array(n).fill(char, 0, n).join(', ')
    }

    patchDateTime(item) {
        const obj = {}
        for (const key of Object.keys(item)) {
            const value = item[key]
            const reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;

            if (value instanceof Date) {
                obj[key] = moment(value).format('YYYY-MM-DD HH:mm:ss')
            } else if (reISO.test(value)) {
                obj[key] = moment(new Date(value)).format('YYYY-MM-DD HH:mm:ss')
            } else {
                obj[key] = value
            }
        }
        return obj
    }

    asParamArrays(item) {
        return Object.values(item);
    }
}

module.exports = DataProvider