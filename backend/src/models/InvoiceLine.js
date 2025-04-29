'use strict';

module.exports = (sequelize, DataTypes) => {
  const InvoiceLine = sequelize.define('InvoiceLine', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'invoices',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    unit_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    hs_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    classification_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    flagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
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
    tableName: 'invoice_lines',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  InvoiceLine.associate = (models) => {
    // InvoiceLine belongs to Invoice
    InvoiceLine.belongsTo(models.Invoice, {
      foreignKey: 'invoice_id',
      as: 'invoice'
    });

    // InvoiceLine has many ClassificationHistory
    InvoiceLine.hasMany(models.ClassificationHistory, {
      foreignKey: 'invoice_line_id',
      as: 'classification_history'
    });
  };

  return InvoiceLine;
};