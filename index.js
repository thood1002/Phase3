const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3001;
const { MongoClient, ObjectId } = require('mongodb');
const url = 'mongodb+srv://thood1002:hunter12@cluster0.yxmd2vf.mongodb.net/?retryWrites=true&w=majority';
const client = new MongoClient(url, { useUnifiedTopology: true });
const db = client.db('name1');
const xml2js = require('xml2js');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'pug');

// Connect to the MongoDB database
(async () => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    app.listen(3001, () => {
      console.log('Server started at http://localhost:3001');
    });
  } catch (err) {
    console.error(err);
  }
})();

// Endpoint to get a single ticket returned as an XML document
app.get('/rest/xml/ticket/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const tickets = db.collection('name2');
    const result = await tickets.findOne({ _id: new ObjectId(id) });
    if (!result) {
      res.status(404).send("Ticket does not exist!");
      return;
    }
    // Convert the JSON object to an XML document using xml2js library
    const builder = new xml2js.Builder({ rootName: 'ticket' });
    const xml = builder.buildObject(result);
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});

// Endpoint to add a single ticket that was sent as an XML document
app.put('/rest/xml/ticket/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // Convert the XML document to a JSON object
    const xmlData = req.body;
    const jsonData = await new Promise((resolve, reject) => {
      xml2js.parseString(xmlData, { explicitArray: false }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // Add the ticket using the existing /ticket/:id endpoint
    const response = await fetch(`http://localhost:3001/ticket/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonData)
    });
    const result = await response.text();
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});

// Endpoint to get all tickets
app.get('/rest/list', async (req, res) => {
  const tickets = db.collection('name2'); // Changed to use the 'db' variable
  const result = await tickets.find().toArray();
  res.send(result);
});

// GET ticket by id
app.get('/ticket/:id', async (req, res) => {
  try {
    const inputId = req.params.id;
    console.log("Looking for ticket with id: " + inputId);
    
    const tickets = db.collection('name2'); // Changed to use the 'db' variable
    const result = await tickets.findOne({ _id: ObjectId.isValid(inputId) ? new ObjectId(inputId) : inputId });
    if (!result) {
      res.status(404).send("Ticket does not exist!");
      return;
    }

    console.log("Ticket exists!");
    res.render('ticketActions', { ticket: result });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});
// Render the ticket view when the user visits /ticket
app.get('/ticket', function(req, res) {
  res.render('ticket');
});

// Create a new ticket when the user submits the form
app.post('/ticket', function(req, res) {
  const newTicket = req.body;
  // Generate a new _id for the newTicket object and insert it into the 'name2' collection in the database
  const tickets = db.collection('name2');
  const newId = new ObjectId();
  newTicket._id = newId;
  tickets.insertOne(newTicket, function(err, result) {
    if (err) {
      console.error(err);
      res.status(500).send("Server error!");
      return;
    }
    console.log("New ticket added with ID: " + newId);
    // render the ticket template with the newly created ticket passed as context
    res.render('ticket', { ticket: newTicket });
  });
});
// Delete a ticket
app.delete('/ticket/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await db.collection('name2').deleteOne({ _id: ObjectId(id) });
    console.log(`Ticket ${id} has been deleted`);
    res.redirect('/ticket/list');
  } catch (err) {
    console.error(err);
    res.render('error');
  }
});
// Update a ticket
app.put('/ticket/:id', function(req, res) {
  const inputId = req.params.id;
  console.log("Updating ticket with ID: " + inputId);
  const updatedTicket = req.body;

  db.collection('name2').updateOne(
    { _id: ObjectId.isValid(inputId) ? new ObjectId(inputId) : inputId },
    { $set: updatedTicket },
    function(err, result) {
      if (err) {
        console.error(err);
        res.status(500).send("Server error!");
        return;
      }
      if (result.matchedCount === 0) {
        res.status(404).send("Ticket does not exist!");
        return;
      }
      console.log("Ticket with ID " + inputId + " has been updated!");
      res.redirect('/ticket/' + inputId);
    }
  );
});
module.exports = app;