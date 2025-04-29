'use strict';

module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    stripe_customer_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    stripe_sub_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'subscriptions',
    timestamps: false
  });

  Subscription.associate = (models) => {
    // Subscription belongs to User
    Subscription.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return Subscription;
};