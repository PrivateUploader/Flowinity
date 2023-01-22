module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn("users", "discordOAuth", {
        type: Sequelize.STRING,
        allowNull: true
      })
    ])
  }
}
