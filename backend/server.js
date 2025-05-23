const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

const metricSchema = new mongoose.Schema({
  hostname: String,
  cpu: Number,
  memory: Number,
  disk: Number,
  uptime: Number,
  os: String,
  timestamp: { type: Date, default: Date.now }
});

const Metric = mongoose.model('Metric', metricSchema);

app.post('/api/metrics', async (req, res) => {
  try {
    await Metric.create(req.body);
    res.status(201).send('Metric stored');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/metrics', async (req, res) => {
  const latest = await Metric.aggregate([
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: "$hostname",
        latest: { $first: "$$ROOT" }
      }
    }
  ]);
  res.json(latest.map(e => e.latest));
});

app.listen(5000, () => console.log("Backend running on port 5000"));
