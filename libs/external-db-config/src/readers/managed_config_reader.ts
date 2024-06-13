import { IConfigReader } from '../types'

export class MysqlConfigReader implements IConfigReader {
    constructor() {
    }

    async readConfig() {
        const { HOST, USER, PASSWORD, DB, DB_PORT, SECRET_KEY } = process.env
        return { host: HOST, user: USER, password: PASSWORD, db: DB, port: DB_PORT, secretKey: SECRET_KEY }
    }
}
