const express = require('express');
const mysql = require("mysql2")
const dotenv = require('dotenv')
const app = express();
const fs = require('fs');
const PDFDocument = require('pdfkit');

const port = process.env.PORT || 3000;

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: '',
});

db.connect((error) => {
    if (error) {
        console.log(error)
    } else {
        console.log("MySQL connected!")
    }
})

app.set('view engine', 'hbs')

// other imports
const path = require("path")

const publicDir = path.join(__dirname, './public')

app.use(express.static(publicDir))

app.get("/", (req, res) => {
    res.render("index")
})

app.listen(5000, () => {
    console.log("server started on port 5000")
})

app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/login", (req, res) => {
    res.render("login")
})

const bcrypt = require("bcryptjs")

app.use(express.urlencoded({ extended: 'false' }))
app.use(express.json())

app.post("/auth/register", async (req, res) => {
    const { tableName, name, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 8);

        var sql = `INSERT INTO users(id, username, password) VALUES (NULL, ?, ?)`;
        db.query(sql, [name, hashedPassword], function (err, result) {
            if (err) {
                console.error("Error while registering:", err);
                res.status(500).send("Error while registering.");
            } else {
                console.log("Successfully registered!");
                res.status(200).send("Successfully registered!");
            }
        });
    } catch (error) {
        console.error("Error while hashing the password:", error);
        res.status(500).send("Error while hashing the password.");
    }
});




app.post("/auth/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        db.query("SELECT * FROM users WHERE username = ?", [req.body.username], function (err, results) {
            if (err) {
                console.error("Error while querying the database:", err);
                res.status(500).send("Error while querying the database.");
            } else {
                if (results.length === 0) {
                    // User not found
                    res.status(401).send("User not found.");
                } else {
                    // User found, compare the hashed password
                    const user = results[0]; // Use results[0] to access the first row
                    const hashedPassword = user.password; // Get the hashed password from the database
        
                    bcrypt.compare(password, hashedPassword, function (err, passwordMatch) {
                        if (err) {
                            console.error("Error while comparing passwords:", err);
                            res.status(500).send("Error while comparing passwords.");
                        } else if (passwordMatch) {
                            // Passwords match, user is authenticated
                            res.status(200).send("Login successful!");
                        } else {
                            // Passwords do not match
                            res.status(401).send("Incorrect password.");
                        }
                    });
                }
            }
        });
        

    } catch (error) {
        console.error("Error while querying the database:", error);
        res.status(500).send("Error while querying the database.");
    }
});

app.get("/form", (req, res) => {
    res.render("form.hbs")
});

// Handle form submission
app.post("/submit-member", (req, res) => {
    const { name, birthdate, address } = req.body;

    // Insert member details into the database
    const sql = "INSERT INTO members (name, birthdate, address) VALUES (?, ?, ?)";
    db.query(sql, [name, birthdate, address], (err, result) => {
        if (err) {
            console.error("Error while inserting member details:", err);
            res.status(500).send("Error while inserting member details.");
        } else {
            console.log("Member details inserted successfully!");
            res.status(200).send("Member details inserted successfully!");
        }
    }); 
});

app.get('/generate', (req, res) => {
    res.render("generate.hbs")
});


app.get('/generate-pdf', (req, res) => {
    // Fetch member details from your database
    db.query('SELECT name, birthdate, address FROM members', (err, results) => {
        if (err) {
            console.error('Error while querying the database:', err);
            return res.status(500).send('Error while querying the database.');
        }

        // Create a new PDF document
        const doc = new PDFDocument();

        // Handle PDF document errors
        doc.on('error', (pdfError) => {
            console.error('Error while creating the PDF:', pdfError);
            res.status(500).send('Error while creating the PDF.');
        });

        // Set response headers for PDF download
        res.setHeader('Content-Disposition', 'attachment; filename=member-details.pdf');
        res.setHeader('Content-Type', 'application/pdf');

        // Pipe the PDF directly to the response
        doc.pipe(res);

        // Add member details to the PDF
        doc.fontSize(14).text('Member Details', { align: 'center' });
        doc.moveDown();
        results.forEach((member) => {
            doc.text(`Name: ${member.name}`);
            doc.text(`Birthdate: ${member.birthdate}`);
            doc.text(`Address: ${member.address}`);
            doc.moveDown();
        });

        // End the PDF document
        doc.end();
    });
});

