'use strict';

const TestRPC = require('ethereumjs-testrpc');
const Web3 = require('web3');
const Promise = require('bluebird');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const GTPermissionManager = require('gt-permission-manager');
const BsTokenData = require('../src/index');

const gas = 3000000;

const provider = TestRPC.provider({
    accounts: [{
        index: 0,
        secretKey: '0x998c22e6ab1959d6ac7777f12d583cc27d6fb442c51770125ab9246cb549db80',
        balance: 200000000
    }]
});

const assert = chai.assert;
const web3 = new Web3(provider);
chai.use(chaiAsPromised);
chai.should();
Promise.promisifyAll(web3.eth);
Promise.promisifyAll(web3.personal);

describe('BsTokenData deployment', function () {
    let bsTokenData;
    const admin = '0x5bd47e61fbbf9c8b70372b6f14b068fddbd834ac';

    describe('deploy', () => {
        it('should be fulfilled', () => {
            return GTPermissionManager.deployContract(web3, admin, gas)
                .then((permissionManager) => BsTokenData.deployContract(web3, admin, permissionManager, gas))
                .then((contract) => bsTokenData = contract);
        }).timeout(60000);
    });

    describe('deployed', () => {
        it('should be fulfilled', () => {
            return BsTokenData.deployedContract(web3, admin, bsTokenData.abi, bsTokenData.address);
        });
    });

});
