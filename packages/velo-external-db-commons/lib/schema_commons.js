const { CannotModifySystemField } = require('./errors')

const SystemFields = [
    {
        name: '_id', type: 'text', subtype: 'string', precision: '50', isPrimary: true
    },
    {
        name: '_createdDate', type: 'datetime', subtype: 'datetime'
    },
    {
        name: '_updatedDate', type: 'datetime', subtype: 'datetime'
    },
    {
        name: '_owner', type: 'text', subtype: 'string', precision: '50'
    }]


const asWixSchema = (fields, collectionName) => {
    return {
        id: collectionName,
        displayName: collectionName,
        allowedOperations: [
            'get',
            'find',
            'count',
            'update',
            'insert',
            'remove'
        ],
        maxPageSize: 50,
        ttl: 3600,
        fields: fields.reduce( (o, r) => ( { ...o, [r.field]: {
                displayName: r.field,
                type: r.type,
                // subtype: r.subtype,
                queryOperators: [
                    'eq',
                    'lt',
                    'gt',
                    'hasSome',
                    'and',
                    'lte',
                    'gte',
                    'or',
                    'not',
                    'ne',
                    'startsWith',
                    'endsWith' // todo: customize this list according to type
                ]
            } }), {} )
    }
}

const validateSystemFields = (columnName) => {
    if (SystemFields.find(f => f.name === columnName)) {
        throw new CannotModifySystemField('Cannot modify system field')
    }
    return Promise.resolve()
}

const parseTableData = data => data.reduce((o, r) => {
                                                    const arr = o[r.table_name] || []
                                                    arr.push(r)
                                                    o[r.table_name] = arr
                                                    return o
                                                }, {})



const schemasWithoutSubtype = schemas => (
            schemas.map(({ fields, ...rest }) => ({
                            ...rest,
                            fields: fieldsWithoutSubType(fields)
                            })
                        )
)

const fieldsWithoutSubType = (fields) => {
    return Object.entries(fields)
                    .reduce((pV, [k, v]) => {
                        const { subtype, ...rest } = v
                        return { ...pV, ...{ [k]: rest } }
                    }, {})
}
                                                

module.exports = { SystemFields, asWixSchema, validateSystemFields, parseTableData, schemasWithoutSubtype, fieldsWithoutSubType }