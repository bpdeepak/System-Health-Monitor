const express = require('express');
const app = express();

app.get('/api/status', (req, res) => {
  res.json({ message: "System OK" });
});

app.listen(5000, () => console.log('Backend running on port 5000'));
