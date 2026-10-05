const { hostname, port, pathname, username, password } = new URL(process.env.DATABASE_URL);

export default {
  driver: "pg",
  migrationPattern: "src/db/migrations/*",
  host: hostname,
  port: Number(port) || 5432,
  database: pathname.slice(1),
  username: decodeURIComponent(username),
  password: decodeURIComponent(password),
};
