const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resource_allocation';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Resource = mongoose.model('Resource', new mongoose.Schema({}, { strict: false }));
  const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
  const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }));

  // 1. Set default companyName for all users where it is missing
  await User.updateMany({ companyName: { $exists: false } }, { $set: { companyName: 'Công ty Công nghệ RAO' } });
  await User.updateMany({ companyName: null }, { $set: { companyName: 'Công ty Công nghệ RAO' } });

  // 2. Explicitly ensure Kha Chấn Tùng has company 'Cty trường con', role 'admin', isOwner true
  const tung = await User.findOne({ email: 'truonghm123@gmail.com' });
  if (tung) {
    await User.updateOne(
      { _id: tung._id },
      { $set: { companyName: 'Cty trường con', role: 'admin', isOwner: true } }
    );
    console.log('Updated Kha Chan Tung to Admin/Owner of Cty trường con');
  }

  // 3. Explicitly ensure admin@rao.com is owner of 'Công ty Công nghệ RAO'
  await User.updateOne(
    { email: 'admin@rao.com' },
    { $set: { companyName: 'Công ty Công nghệ RAO', role: 'admin', isOwner: true } }
  );

  // 4. Sync Resource companyName from its linked User
  const users = await User.find({});
  for (const u of users) {
    await Resource.updateMany(
      { user: u._id },
      { $set: { companyName: u.companyName || 'Công ty Công nghệ RAO' } }
    );
  }
  // Any orphan resources without companyName get default
  await Resource.updateMany({ companyName: { $exists: false } }, { $set: { companyName: 'Công ty Công nghệ RAO' } });
  await Resource.updateMany({ companyName: null }, { $set: { companyName: 'Công ty Công nghệ RAO' } });

  // 5. Default companyName for projects and departments
  await Project.updateMany({ companyName: { $exists: false } }, { $set: { companyName: 'Công ty Công nghệ RAO' } });
  await Project.updateMany({ companyName: null }, { $set: { companyName: 'Công ty Công nghệ RAO' } });
  await Department.updateMany({ companyName: { $exists: false } }, { $set: { companyName: 'Công ty Công nghệ RAO' } });
  await Department.updateMany({ companyName: null }, { $set: { companyName: 'Công ty Công nghệ RAO' } });

  console.log('Migration completed successfully!');
  const allUsers = await User.find({}, 'name email role isOwner companyName');
  console.log('Current users:\n' + JSON.stringify(allUsers, null, 2));

  await mongoose.disconnect();
}

migrate().catch(console.error);
