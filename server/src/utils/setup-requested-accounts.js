const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const User = require('../models/User');
const Resource = require('../models/Resource');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';

async function setupAccounts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB...');

    // 1. Setup Project Manager: truongfddssd@gmail.com / 123123
    let pmUser = await User.findOne({ email: 'truongfddssd@gmail.com' });
    if (!pmUser) {
      pmUser = new User({
        name: 'Trương Project Manager',
        email: 'truongfddssd@gmail.com',
        password: 'password_placeholder',
        role: 'project_manager',
        department: 'Project Management Office',
        jobTitle: 'Quản lý Dự án (PM)',
        companyName: 'Công ty Công nghệ RAO',
        phone: '0988 123 456',
        isActive: true,
      });
    } else {
      pmUser.name = pmUser.name || 'Trương Project Manager';
      pmUser.role = 'project_manager';
      pmUser.department = 'Project Management Office';
      pmUser.jobTitle = 'Quản lý Dự án (PM)';
      pmUser.companyName = 'Công ty Công nghệ RAO';
      pmUser.isActive = true;
    }
    pmUser.password = '123123';
    await pmUser.save();
    console.log(`✓ Project Manager account ready: ${pmUser.email} (Role: ${pmUser.role}, ID: ${pmUser._id})`);

    // Sync Resource for PM
    let pmResource = await Resource.findOne({ user: pmUser._id });
    if (!pmResource) {
      pmResource = await Resource.create({
        user: pmUser._id,
        employeeId: 'RAO-PM-01',
        position: 'Project Manager',
        department: pmUser.department,
        skills: [
          { name: 'Agile/Scrum', level: 4, yearsOfExperience: 5 },
          { name: 'Project Management', level: 4, yearsOfExperience: 5 },
        ],
        maxCapacity: 40,
        hourlyRate: 50,
        availability: 'available',
      });
    } else {
      pmResource.position = 'Project Manager';
      pmResource.department = pmUser.department;
      await pmResource.save();
    }

    // 2. Setup Member: nem@gmail.com / 123123
    let memberUser = await User.findOne({ email: 'nem@gmail.com' });
    if (!memberUser) {
      memberUser = new User({
        name: 'Nem Member',
        email: 'nem@gmail.com',
        password: 'password_placeholder',
        role: 'member',
        department: 'Engineering',
        jobTitle: 'Kỹ sư Phần mềm (Senior Developer)',
        companyName: 'Công ty Công nghệ RAO',
        phone: '0977 654 321',
        manager: pmUser._id,
        isActive: true,
      });
    } else {
      memberUser.name = memberUser.name || 'Nem Member';
      memberUser.role = 'member';
      memberUser.department = 'Engineering';
      memberUser.jobTitle = 'Kỹ sư Phần mềm (Senior Developer)';
      memberUser.companyName = 'Công ty Công nghệ RAO';
      memberUser.manager = pmUser._id;
      memberUser.isActive = true;
    }
    memberUser.password = '123123';
    await memberUser.save();
    console.log(`✓ Member account ready: ${memberUser.email} (Role: ${memberUser.role}, Manager: ${pmUser.name}, ID: ${memberUser._id})`);

    // Sync Resource for Member
    let memberResource = await Resource.findOne({ user: memberUser._id });
    if (!memberResource) {
      memberResource = await Resource.create({
        user: memberUser._id,
        employeeId: 'RAO-DEV-99',
        position: 'Senior Developer',
        department: memberUser.department,
        skills: [
          { name: 'React', level: 4, yearsOfExperience: 4 },
          { name: 'Node.js', level: 4, yearsOfExperience: 4 },
          { name: 'MongoDB', level: 3, yearsOfExperience: 3 },
          { name: 'TypeScript', level: 4, yearsOfExperience: 3 },
        ],
        maxCapacity: 40,
        hourlyRate: 35,
        availability: 'available',
      });
    } else {
      memberResource.position = 'Senior Developer';
      memberResource.department = memberUser.department;
      await memberResource.save();
    }

    console.log('\n==========================================');
    console.log('ACCOUNTS SETUP COMPLETED SUCCESSFULLY');
    console.log('1. Project Manager: truongfddssd@gmail.com / 123123');
    console.log('2. Member: nem@gmail.com / 123123 (Manager: truongfddssd@gmail.com)');
    console.log('==========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error setting up accounts:', err);
    process.exit(1);
  }
}

setupAccounts();
