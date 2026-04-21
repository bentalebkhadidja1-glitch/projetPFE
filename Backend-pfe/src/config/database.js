import { Sequelize } from 'sequelize';


const sequelize = new Sequelize(
  'postgres',           // database name
  'postgres.dciekpixcommdcxrzirl',  // username (with project ref)
  'Benta-205@&',      // your database password
  {
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
);

export default sequelize;