const express = require("express");
const oracledb = require("oracledb");
const app = express();
const port = 3000;

app.use(express.json());

const dbConfig = {
  user: "system",
  password: "123456",
  connectString: "localhost:1521/xe",
};

// 1. OBTENER USUARIO POR ID (GET)
app.get("/usuarios/:id", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT * FROM usuarios WHERE id = :id`,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    if (connection) await connection.close();
  }
});

// 1.1 OBTENER TODOS LOS USUARIOS (GET)
app.get("/usuarios", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT * FROM usuarios`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    if (connection) await connection.close();
  }
});

// 2. INSERTAR USUARIO (POST)
app.post("/usuarios", async (req, res) => {
  let connection;
  const { nombre, correo } = req.body;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `INSERT INTO usuarios (nombre, correo) VALUES (:1, :2)`,
      [nombre, correo],
    );
    await connection.commit();
    res.status(201).send("Usuario creado");
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    if (connection) await connection.close();
  }
});

// 3. ELIMINAR USUARIO (DELETE)
app.delete("/usuarios/:id", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(`DELETE FROM usuarios WHERE id = :id`, [
      req.params.id,
    ]);
    await connection.commit();
    res.send("Usuario eliminado");
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    if (connection) await connection.close();
  }
});

app.listen(port, () => {
  console.log(`Servidor API escuchando en http://localhost:${port}`);
});
