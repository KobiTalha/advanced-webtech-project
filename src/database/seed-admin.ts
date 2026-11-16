import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

async function seedAdmin() {
  try {
    await AppDataSource.initialize();

    const repository = AppDataSource.getRepository(User);

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const fullName = process.env.ADMIN_NAME;

    if (!email || !password || !fullName) {
      throw new Error('Admin environment variables are missing');
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('Admin password exceeds bcrypt 72-byte limit');
    }

    const existing = await repository.findOne({
      where: { email },
    });

    if (existing) {
      console.log('Admin account already exists.');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = repository.create({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      role: UserRole.ADMIN,
      is_active: true,
    });

    await repository.save(admin);

    console.log('Initial administrator created successfully.');
  } catch (error) {
    console.error('Admin seeding failed:', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

seedAdmin();