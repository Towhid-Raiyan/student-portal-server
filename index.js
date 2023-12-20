const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
// const stripe = require("stripe")(process.env.SECRET_KEY);
const port = process.env.PORT || 5000;

const corsConfig = {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Origin",
        "X-Requested-With",
        "Accept",
        "x-client-key",
        "x-client-token",
        "x-client-secret",
        "Authorization",
    ],
    credentials: true,
};


//middleware
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res
            .status(401)
            .send({ error: true, message: "Unauthorized Access!!!" });
    }
    const token = authorization.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res
                .status(403)
                .send({ error: true, message: "Forbidden Access!!!" });
        }
        req.decoded = decoded;
        next();
    });
};


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cq8nopc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

        const usersCollection = client.db("studentPortalDB").collection("users");
        const classesCollection = client.db("studentPortalDB").collection("classes");
        const selectedCourseCollection = client.db("studentPortalDB").collection("selectedCourse");
        // const paymentCollection = client
        //     .db("ornaldoSportsDB")
        //     .collection("payment");
        // jwt
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "2h",
            });
            res.send({ token });
        });

        // store an user to the database
        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            console.log(user);
            if (existingUser) {
                return res.send({ message: "User already exists!" });
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

         //   get approved classes
         app.get("/classes", async (req, res) => {
            const classes = await classesCollection
                .find()
                .toArray();
            res.send(classes);
        });

        //save selected class
        app.post("/classes",verifyJWT, async (req, res) => {
            const selectedClass = req.body;
            // check already selected or not ?
            const email = selectedClass.email;
            const courseId = selectedClass.course._id;

            const existingSelection = await selectedCourseCollection.findOne({
                email: email,
                "course._id": courseId,
            });
            if (existingSelection) {
                // Email has already selected this course
                return res.send({
                    error: "This course has already been selected by the email.",
                });
            }
            
            // console.log(selectedClass);
            const result = await selectedCourseCollection.insertOne(
                selectedClass
            );
            res.send(result);
        });
        

        // get selected classes
        app.get("/selectedClasses/:email",verifyJWT, async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const selectedClasses = await selectedCourseCollection
                .find({ email })
                .toArray();
            res.send(selectedClasses);
        });

         // get all classes
         app.get("/all-classes", async (req, res) => {
          
            const allClasses = await classesCollection.find().toArray();
            res.send(allClasses);
        });


        // isStudent??
        app.get("/users/student/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;

            console.log(email);
            if (req.decoded.email !== email) {
                res.send({ student: false });
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { student: user?.role === "student" };
            res.send(result);
        });

        //admin

        // verify admin?
        app.get("/users/admin/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;

            console.log(email);
            if (req.decoded.email !== email) {
                res.send({ admin: false });
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === "admin" };
            res.send(result);
        });

        // add a course
        app.post("/api/classes",verifyJWT, async (req, res) => {
            const newClass = req.body;
            const result = await classesCollection.insertOne(newClass);
            res.send(result);
        });

        // for admin

        app.get("/all-users", verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        // for course enrolled user
        app.get("/enrolledUser", verifyJWT, async (req, res) => {
            const enrolledUser = await selectedCourseCollection.find().toArray();
            res.send(enrolledUser);
        });


    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Student Portal Server is Running...");
});

app.listen(port, () => {
    console.log(`Student Portal Server Running on PORT:  ${port}`);
});