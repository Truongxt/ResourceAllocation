const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

async function setPw() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resource_allocation');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const hashed = await bcrypt.hash('123123', 10);
  await User.updateOne({ email: 'sile2004@gmail.com' }, { $set: { password: hashed } });
  await User.updateOne({ email: 'truongprolavua20041@gmail.com' }, { $set: { password: hashed } });
  console.log('Password reset to 123123 for sile2004 and truongprolavua20041');
  await mongoose.disconnect();
}
setPw();
