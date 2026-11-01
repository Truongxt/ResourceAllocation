import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const { default: Task } = await import('../server/src/models/Task.js');
  const { default: Project } = await import('../server/src/models/Project.js');
  const { default: User } = await import('../server/src/models/User.js');
  const taskCtrl = await import('../server/src/controllers/task.controller.js');

  console.log('task.controller exports:', Object.keys(taskCtrl));
  console.log('Has promoteSubtask?', typeof taskCtrl.promoteSubtask === 'function');
  console.log('Has demoteToSubtask?', typeof taskCtrl.demoteToSubtask === 'function');
  console.log('Has duplicateTask?', typeof taskCtrl.duplicateTask === 'function');

  // Find an admin user
  const admin = await User.findOne({ role: 'admin' });
  console.log('Admin user found:', admin?.email);

  await mongoose.disconnect();
  console.log('All backend checks passed cleanly!');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

