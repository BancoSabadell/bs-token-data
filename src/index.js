'use strict';

const Deployer = require('contract-deployer');
const fs = require('fs');
const path = require('path');
const GTPermissionManager = require('gt-permission-manager');


exports.contracts = {
};

module.exports.contracts = Object.assign(GTPermissionManager.contracts, {
    'Admin.sol': fs.readFileSync(path.join(__dirname, '../contracts/Admin.sol'), 'utf8'),
    'Stoppable.sol': fs.readFileSync(path.join(__dirname, '../contracts/Stoppable.sol'), 'utf8'),
    'BSTokenData.sol': fs.readFileSync(path.join(__dirname, '../contracts/BSTokenData.sol'), 'utf8')
});

exports.deployedContract = function (web3, admin, permissionManager, gas) {
    const deployer = new Deployer(web3, {sources: exports.contracts}, 0);
    return deployer.deploy('BSTokenData', [permissionManager.address], { from: admin, gas: gas });
};
