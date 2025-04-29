'use strict';

module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define('Invoice', {
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
    supplier: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    invoice_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Draft'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'invoices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Invoice.associate = (models) => {
    // Invoice belongs to User
    Invoice.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Invoice has many InvoiceLines
    Invoice.hasMany(models.InvoiceLine, {
      foreignKey: 'invoice_id',
      as: 'invoice_lines'
    });

    // Invoice has many Submissions
    Invoice.hasMany(models.Submission, {
      foreignKey: 'invoice_id',
      as: 'submissions'
    });
  };

  return Invoice;
};