import { getSchema } from "./base44/shared/entitySchemas.ts";

const entite = "Employee";
const schema = getSchema(entite);
console.log("Schema exists?", !!schema);
const fields = Object.keys(schema.properties);
console.log("Fields:", fields);

const c = "employee_id";
console.log("Includes employee_id?", fields.includes(c));

