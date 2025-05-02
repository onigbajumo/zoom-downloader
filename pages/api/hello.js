

export default async function handler(req, res) {
//   await connectToMongoDB(); // Connect to MongoDB
  res.status(200).json({ message: 'Check your console to see if the DB is connected' });
}