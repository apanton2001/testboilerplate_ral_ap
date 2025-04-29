'use strict';

module.exports = (sequelize, DataTypes) => {
  const ClassificationHistory = sequelize.define('ClassificationHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    invoice_line_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'invoice_lines',
        key: 'id'
      }
    },
    previous_hs_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    new_hs_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    changed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    changed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'classification_history',
    timestamps: false
  });

  ClassificationHistory.associate = (models) => {
    // ClassificationHistory belongs to InvoiceLine
    ClassificationHistory.belongsTo(models.InvoiceLine, {
      foreignKey: 'invoice_line_id',
      as: 'invoice_line'
    });

    // ClassificationHistory belongs to User (who made the change)
    ClassificationHistory.belongsTo(models.User, {
      foreignKey: 'changed_by',
      as: 'user'
    });
  };

  return ClassificationHistory;
};