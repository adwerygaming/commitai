import { PrismaClient } from "../generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const prismaLibSql = new PrismaLibSql({
    url: process.env.DATABASE_URL!
})
const DatabaseClient = new PrismaClient({ adapter: prismaLibSql })
export default DatabaseClient