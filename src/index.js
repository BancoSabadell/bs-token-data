'use strict';

const Deployer = require('contract-deployer');
const fs = require('fs');
const path = require('path');

exports.contracts = {
    'BSTokenData.sol': fs.readFileSync(path.join(__dirname, '../contracts/BSTokenData.sol'), 'utf8'),
    'PermissionManager.sol': fs.readFileSync(path.join(__dirname, '../contracts/PermissionManager.sol'), 'utf8')
};

exports.deployedContract = function (web3, admin, permissionManager, gas) {
    const deployer = new Deployer(web3, {sources: exports.contracts}, 0);
    return deployer.deploy('BSTokenData', [permissionManager.address], { from: admin, gas: gas });
};
