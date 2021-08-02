const {Uninitialized} = require("test-commons");
const {authInit} = require("../drivers/auth-test-support");
const postgres = require("../resources/postgres_resources");
const mysql = require("../resources/mysql_resources");

const env = {
    secretKey: Uninitialized,
    app: Uninitialized,
}

const initApp = () => {
    authInit()
    if (env.app) {
        env.app.load()
    }
    env.app = require('../..')
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const teardownApp = async () => {
    await sleep(500)
    await env.app.server.close()
}

const dbInit = async impl => {
    await impl.cleanup()
    impl.setActive()
}

const dbTeardown = async () => {
    await env.app.cleanup()
}

const postgresTestEnvInit = async () => await dbInit(postgres)
const mysqlTestEnvInit = async () => await dbInit(mysql)


module.exports = { env, initApp, teardownApp, dbTeardown,
                   postgresTestEnvInit,
                   mysqlTestEnvInit
}