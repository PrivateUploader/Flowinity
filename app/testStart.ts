import "tsconfig-paths/register"
import "reflect-metadata"
import path from "path"
import { exec, execSync } from "child_process"
import db from "@app/db"

export async function init() {
  console.log("init")
  global.appRoot = path.resolve(__dirname).includes("out")
    ? path.join(__dirname, "..", "app")
    : path.join(__dirname)
  global.rawAppRoot = path.resolve(__dirname)
  try {
    global.config = require(global.appRoot + "/config/tpu.json")
  } catch {
    throw Error("No config file found")
  }
  process.env.APP_ROOT = global.appRoot
  process.env.RAW_APP_ROOT = global.rawAppRoot
  process.env.CONFIG = JSON.stringify(global.config)
  process.env.NODE_ENV = "test"
  await db.query("DROP DATABASE IF EXISTS `upload_test`")
  await db.query("CREATE DATABASE `upload_test`")
  await db.query("USE `upload_test`")
  try {
    console.log("DB OK")
    // try using system sequelize-cli first, only thing that works in Docker too
    await execSync("NODE_ENV=test sequelize db:migrate", {
      cwd: global.appRoot,
      stdio: "inherit"
    })
    await db.query("SET FOREIGN_KEY_CHECKS = 0")
    await db.models.User.create({
      id: 69,
      username: "testaccountnottakenadmin",
      email: "eee@ee.com",
      password: "nologin",
      administrator: true
    })
    await db.models.Plan.create({
      id: 1,
      internalName: "FREE",
      name: "Free",
      quotaMax: 10000000,
      internalFeatures: { maxFileSize: 69696969, invites: 4 },
      features: [],
      price: 0
    })
    await db.models.Plan.create({
      id: 7,
      internalName: "FREE",
      name: "Free",
      quotaMax: 10000000,
      internalFeatures: { maxFileSize: 69696969, invites: 4 },
      features: [],
      price: 0
    })
    await db.models.Plan.create({
      id: 6,
      internalName: "GOLD",
      name: "Gold",
      quotaMax: 10000000,
      internalFeatures: { maxFileSize: 69696969, invites: 4 },
      icon: "mdi-plus",
      features: [],
      price: 0
    })
    await db.models.Domain.create({
      id: 1,
      domain: "localhost",
      userId: 69
    })
    await db.query("SET FOREIGN_KEY_CHECKS = 1")
    await db.close()
  } catch {
    console.log("error")
    try {
      exec(
        global.appRoot + "../node_modules/.bin/sequelize db:migrate",
        async (error, stdout, stderr) => {
          console.log(stdout)
        }
      )
    } catch {
      console.warn("Could not run sequelize-cli")
    }
  }
}

init().then(() => process.exit())