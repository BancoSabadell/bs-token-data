'use strict';

const Deployer = require('contract-deployer');
const fs = require('fs');
const path = require('path');
const GTPermissionManager = require('gt-permission-manager');
const Promise = require('bluebird');

exports.contracts = Object.assign(GTPermissionManager.contracts, {
    'Admin.sol': fs.readFileSync(path.join(__dirname, '../contracts/Admin.sol'), 'utf8'),
    'Stoppable.sol': fs.readFileSync(path.join(__dirname, '../contracts/Stoppable.sol'), 'utf8'),
    'BSTokenData.sol': fs.readFileSync(path.join(__dirname, '../contracts/BSTokenData.sol'), 'utf8')
});

exports.deployContract = function (web3, admin, permissionManager, gas) {
    const deployer = new Deployer(web3, {sources: exports.contracts}, 0);
    return deployer.deploy('BSTokenData', [permissionManager.address], { from: admin, gas: gas })
        .then(bsTokenData => {
            checkContract(bsTokenData);
            return bsTokenData;
        });
};

exports.deployedContract = function (web3, admin, abi, address) {
    const bsTokenData = web3.eth.contract(abi).at(address);
    Promise.promisifyAll(bsTokenData);
    checkContract(bsTokenData);
    return Promise.resolve(bsTokenData);
};

function checkContract(bsTokenData) {
    if (!bsTokenData.abi) {
        throw new Error('abi must not be null');
    }

    if (!bsTokenData.address) {
        throw new Error('address must not be null');
    }

    if (typeof bsTokenData.setBalanceAsync === "undefined") {
        throw new Error('contract has not been properly deployed');
    }
}
