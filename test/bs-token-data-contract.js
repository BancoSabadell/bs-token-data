'use strict';

const TestRPC = require('ethereumjs-testrpc');
const Web3 = require('web3');
const Promise = require('bluebird');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const GTPermissionManager = require('gt-permission-manager');

const BsTokenData = require('../src/index');
const BigNumber = require('bignumber.js');
const gas = 3000000;

const provider = TestRPC.provider({
    accounts: [{
        index: 0,
        secretKey: '0x998c22e6ab1959d6ac7777f12d583cc27d6fb442c51770125ab9246cb549db80',
        balance: 200000000
    }, {
        index: 1,
        secretKey: '0x998c22e6ab1959d6ac7777f12d583cc27d6fb442c51770125ab9246cb549db81',
        balance: 200000000
    }, {
        index: 2,
        secretKey: '0x998c22e6ab1959d6ac7777f12d583cc27d6fb442c51770125ab9246cb549db82',
        balance: 200000000
    }, {
        index: 3,
        secretKey: '0x998c22e6ab1959d6ac7777f12d583cc27d6fb442c51770125ab9246cb549db83',
        balance: 200000000
    }]
});

const web3 = new Web3(provider);
chai.use(chaiAsPromised);
chai.should();

Promise.promisifyAll(web3.eth);
Promise.promisifyAll(web3.personal);


describe('BsTokenData contract', function () {
    const amount = 100;

    let bsTokenData = null;
    let permissionManager = null;

    const admin = '0x5bd47e61fbbf9c8b70372b6f14b068fddbd834ac';
    const account2 = '0x25e940685e0999d4aa7bd629d739c6a04e625761';
    const merchant = '0x6128333118cef876bd620da1efa464437470298d';
    const spender = '0x93e17017217881d157a47c6ed6d7ae4c8d7ed2bf';

    before(function() {
        this.timeout(60000);
        return GTPermissionManager.deployedContract(web3, admin, gas)
            .then((contract) => permissionManager = contract)
            .then(() => BsTokenData.deployedContract(web3, admin, permissionManager, gas))
            .then((contract) => {
                bsTokenData = contract;
            })
            .then(() => {
                // bsTokenData role = 2
                return permissionManager.createAndSetRolAsync(bsTokenData.address, { from: admin, gas: gas });
            })
            .then(() => {
                // Blockced role = 3
                return permissionManager.createRolAsync( { from: admin, gas: gas });
            })
            .then(() => {
                // Emergency role = 4
                return permissionManager.createRolAsync( { from: admin, gas: gas });
            })
            .then(() => {
                // Merchant role = 5
                return permissionManager.createAndSetRolAsync(merchant, { from: admin, gas: gas })
            })
            .then(() => {
                // Relationship from merchant to Data
                return permissionManager.allowInteractionAsync(5, 2, 0, { from: admin, gas: gas })
            });
    });

    describe('deployment', () => {
        it('check number of roles', () => {
            return permissionManager.getNumRolesAsync()
                .should.eventually.satisfy(num => num.equals(new BigNumber(6)), `num should be 6`);
        });

        it('check role admin', () => {
            return permissionManager.getRolAsync(admin)
                .should.eventually.satisfy(role => role.equals(new BigNumber(1)), `rol should be 1`);
        });

        it('check admin permissions', () => {
            return permissionManager.getNetworkAdminAsync(1)
                .should.eventually.equals(true);
        });

        it('check role merchant', () => {
            return permissionManager.getRolAsync(merchant)
                .should.eventually.satisfy(role => role.equals(new BigNumber(5)), `rol should be 5`);
        });

        it('check role account2', () => {
            return permissionManager.getRolAsync(account2)
                .should.eventually.satisfy(role => role.equals(new BigNumber(0)), `rol should be 0`);
        });

        it('check role BSTokenData', () => {
            return permissionManager.getRolAsync(bsTokenData.address)
                .should.eventually.satisfy(role => role.equals(new BigNumber(2)), `rol should be 2`);
        });

        it('check relationship 0 from merchant to BSTokenData', () => {
            return permissionManager.getRelationshipAsync(merchant, bsTokenData.address, 0)
                .should.eventually.equals(true);
        });
    });

    describe('stoppable as admin', () => {
        it('start should be fulfilled', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 4, {
                from: admin,
                gas: gas
            });
        });

        it('stop should be fulfilled', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 2, {
                from: admin,
                gas: gas
            });
        });
    });

    describe('stoppable as non admin account', () => {
        it('start should be rejected', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 4, {
                from: account2,
                gas: gas
            }).should.eventually.be.rejected;
        });

        it('stopEmergency should be rejected', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 2, {
                from: account2,
                gas: gas
            }).should.eventually.be.rejected;
        });
    });

    describe('freeze and unfreeze account as admin', () => {

        it('freeze should be fulfilled', () => {
            return permissionManager.setRolAsync(account2, 3, {
                from: admin,
                gas: gas
            });
        });

        it('check state account', () => {
            return permissionManager.getRolAsync(account2)
                .should.eventually.satisfy(rol => rol.equals(new BigNumber(3)), `rol should be 3`);
        });

        it('unfreeze should be fulfilled', () => {
            return permissionManager.setRolAsync(account2, 0, {
                from: admin,
                gas: gas
            });
        });

        it('check state account', () => {
            return permissionManager.getRolAsync(account2)
                .should.eventually.satisfy(rol => rol.equals(new BigNumber(0)), `rol should be 0`);
        });
    });

    describe('freeze and unfreeze account as non admin account', () => {
        it('should be rejected', () => {
            const promise = permissionManager.setRolAsync(account2, 3, {
                from: account2,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('check state account', () => {
            return permissionManager.getRolAsync(account2)
                .should.eventually.satisfy(rol => rol.equals(new BigNumber(0)), `rol should be 0`);
        });
    });

    describe('add/remove merchant as admin', () => {
        it('add should be fulfilled', () => {
            return permissionManager.setRolAsync(merchant, 5, {
                from: admin,
                gas: gas
            });
        });

        it('interaction should be fulfilled', () => {
            return permissionManager.allowInteractionAsync(5, 2, 0, {
                from: admin,
                gas: gas
            });
        });

        it('check merchant', () => {
            return permissionManager.getRelationshipAsync(merchant, bsTokenData.address, 0)
                .should.eventually.equals(true);
        });

        it('remove should be fulfilled', () => {
            return permissionManager.disallowInteractionAsync(5, 2, 0, { from: admin, gas: gas });
        });

        it('check merchant', () => {
            return permissionManager.getRelationshipAsync(merchant, bsTokenData.address, 0)
                .should.eventually.equals(false);
        });

        it('add merchant again', () => {
            return permissionManager.allowInteractionAsync(5, 2, 0, { from: admin, gas: gas });
        });
    });

    describe('add/remove merchant as non admin account', () => {
        it('add should be rejected', () => {
            const promise = permissionManager.setRolAsync(merchant, 5, {
                from: account2,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('check merchant', () => {
            return permissionManager.getRelationshipAsync(merchant, bsTokenData.address, 0)
              .should.eventually.equals(true);
        });

        it('remove should be rejected', () => {
            const promise = permissionManager.setRolAsync(merchant, 0, {
                from: account2,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('check merchant', () => {
            return permissionManager.getRelationshipAsync(merchant, bsTokenData.address, 0)
              .should.eventually.equals(true);
        });
    });

    describe('set/get Balance as admin', () => {
        it('start emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 4, {
                from: admin,
                gas: gas
            });
        });

        it('setBalance should be rejected if stopInEmergency', () => {
            const promise = bsTokenData.setBalanceAsync(account2, amount, {
                from: admin,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('stop emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 2, {
                from: admin,
                gas: gas
            });
        });

        it('setBalance should be fulfilled', () => {
            return bsTokenData.setBalanceAsync(account2, amount, {
                from: admin,
                gas: gas
            });
        });

        it('check balance', () => {
            return bsTokenData.getBalanceAsync(account2)
                .should.eventually.satisfy(balance => balance.equals(new BigNumber(amount)), `balance should be ${amount}`);
        });

        it('setBalance should be fulfilled', () => {
            return bsTokenData.setBalanceAsync(account2, 0, {
                from: admin,
                gas: gas
            });
        });

        it('check balance', () => {
            return bsTokenData.getBalanceAsync(account2)
                .should.eventually.satisfy(balance => balance.equals(new BigNumber(0)), `balance should be 0`);
        });
    });

    describe('set/get Balance as merchant', () => {
        it('add merchant', () => {
            return permissionManager.setRolAsync(merchant, 5, {
                from: admin,
                gas: gas
            });
        });

        it('start emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 4, {
                from: admin,
                gas: gas
            });
        });

        it('setBalance should be rejected if stopInEmergency', () => {
            const promise = bsTokenData.setBalanceAsync(account2, amount, {
                from: merchant,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('stop emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 2, {
                from: admin,
                gas: gas
            });
        });

        it('setBalance should be fulfilled', () => {
            return bsTokenData.setBalanceAsync(account2, amount, {
                from: merchant,
                gas: gas
            });
        });

        it('check balance', () => {
            return bsTokenData.getBalanceAsync(account2)
                .should.eventually.satisfy(balance => balance.equals(new BigNumber(amount)), `balance should be ${amount}`);
        });

        it('setBalance should be fulfilled', () => {
            return bsTokenData.setBalanceAsync(account2, 0, {
                from: merchant,
                gas: gas
            });
        });

        it('check balance', () => {
            return bsTokenData.getBalanceAsync(account2)
                .should.eventually.satisfy(balance => balance.equals(new BigNumber(0)), `balance should be 0`);
        });

        it('remove merchant', () => {
            return permissionManager.setRolAsync(merchant, 0, { from: admin, gas: gas });
        });
    });

    describe('set/get Balance as non admin/merchant', () => {
        it('setBalance should be rejected', () => {
            const promise = bsTokenData.setBalanceAsync(account2, amount, {
                from: merchant,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('check balance', () => {
            return bsTokenData.getBalanceAsync(account2)
                .should.eventually.satisfy(balance => balance.equals(new BigNumber(0)), `balance should be 0`);
        });
    });

    describe('set/get totalSupply as admin', () => {
        it('start emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 4, {
                from: admin,
                gas: gas
            });
        });

        it('setTotalSupply should be rejected if stopInEmergency', () => {
            const promise = bsTokenData.setTotalSupplyAsync(amount, {
                from: admin,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('stop emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 2, {
                from: admin,
                gas: gas
            });
        });

        it('setTotalSupply should be fulfilled', () => {
            return bsTokenData.setTotalSupplyAsync(amount, {
                from: admin,
                gas: gas
            });
        });

        it('check total supply', () => {
            return bsTokenData.getTotalSupplyAsync(account2)
                .should.eventually.satisfy(supply => supply.equals(new BigNumber(amount)), `supply should be ${amount}`);
        });

        it('setTotalSupply should be fulfilled', () => {
            return bsTokenData.setTotalSupplyAsync(0, {
                from: admin,
                gas: gas
            });
        });

        it('check total supply', () => {
            return bsTokenData.getTotalSupplyAsync(account2)
                .should.eventually.satisfy(supply => supply.equals(new BigNumber(0)), `supply should be 0`);
        });
    });

    describe('set/get totalSupply as merchant', () => {
        it('add merchant', () => {
            return permissionManager.setRolAsync(merchant, 5, {
                from: admin,
                gas: gas
            });
        });

        it('add Data', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 2, {
                from: admin,
                gas: gas
            });
        });

        it('create interaction', () => {
            return permissionManager.allowInteractionAsync(5, 2, 0, {
                from: admin,
                gas: gas
            });
        });

        it('start emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 4, {
                from: admin,
                gas: gas
            });
        });

        it('setTotalSupply should be rejected if stopInEmergency', () => {
            const promise = bsTokenData.setTotalSupplyAsync(amount, {
                from: merchant,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('stop emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 2, {
                from: admin,
                gas: gas
            });
        });

        it('setTotalSupply should be fulfilled', () => {
            return bsTokenData.setTotalSupplyAsync(amount, {
                from: merchant,
                gas: gas
            });
        });

        it('check total supply', () => {
            return bsTokenData.getTotalSupplyAsync(account2)
                .should.eventually.satisfy(supply => supply.equals(new BigNumber(amount)), `supply should be ${amount}`);
        });

        it('setTotalSupply should be fulfilled', () => {
            return bsTokenData.setTotalSupplyAsync(0, {
                from: merchant,
                gas: gas
            });
        });

        it('check total supply', () => {
            return bsTokenData.getTotalSupplyAsync(account2)
                .should.eventually.satisfy(supply => supply.equals(new BigNumber(0)), `supply should be 0`);
        });

        it('remove merchant', () => {
            return permissionManager.setRolAsync(merchant, 0, {
                from: admin,
                gas: gas
            });
        });
    });

    describe('set/get totalSupply as non admin/merchant', () => {
        it('setTotalSupply should be rejected', () => {
            const promise = bsTokenData.setBalanceAsync(account2, amount, {
                from: account2,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('check total supply', () => {
            return bsTokenData.getTotalSupplyAsync(account2)
                .should.eventually.satisfy(supply => supply.equals(new BigNumber(0)), `supply should be 0`);
        });
    });

    describe('set/get allowance as admin', () => {
        it('start emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 4, {
                from: admin,
                gas: gas
            });
        });

        it('setAllowance should be rejected if stopInEmergency', () => {
            const promise = bsTokenData.setAllowanceAsync(account2, spender, amount, {
                from: admin,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('stop emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 2, {
                from: admin,
                gas: gas
            });
        });

        it('setAllowance should be fulfilled', () => {
            return bsTokenData.setAllowanceAsync(account2, spender, amount, {
                from: admin,
                gas: gas
            });
        });

        it('check allowance', () => {
            return bsTokenData.getAllowanceAsync(account2, spender)
                .should.eventually.satisfy(allowance => allowance.equals(new BigNumber(amount)), `allowance should be ${amount}`);
        });

        it('setAllowance should be fulfilled', () => {
            return bsTokenData.setAllowanceAsync(account2, spender, 0, {
                from: admin,
                gas: gas
            });
        });

        it('check allowance', () => {
            return bsTokenData.getAllowanceAsync(account2, spender)
                .should.eventually.satisfy(allowance => allowance.equals(new BigNumber(0)), `allowance should be 0`);
        });
    });

    describe('set/get allowance as merchant', () => {
        it('add merchant', () => {
            return permissionManager.setRolAsync(merchant, 5, {
                from: admin,
                gas: gas
            });
        });

        it('start emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 4, {
                from: admin,
                gas: gas
            });
        });

        it('setAllowance should be rejected if stopInEmergency', () => {
            const promise = bsTokenData.setAllowanceAsync(account2, spender, amount, {
                from: merchant,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('stop emergency', () => {
            return permissionManager.setRolAsync(bsTokenData.address, 2, {
                from: admin,
                gas: gas
            });
        });

        it('setAllowance should be fulfilled', () => {
            return bsTokenData.setAllowanceAsync(account2, spender, amount, {
                from: merchant,
                gas: gas
            });
        });

        it('check allowance', () => {
            return bsTokenData.getAllowanceAsync(account2, spender)
                .should.eventually.satisfy(allowance => allowance.equals(new BigNumber(amount)), `allowance should be ${amount}`);
        });

        it('setAllowance should be fulfilled', () => {
            return bsTokenData.setAllowanceAsync(account2, spender, 0, {
                from: merchant,
                gas: gas
            });
        });

        it('check allowance', () => {
            return bsTokenData.getAllowanceAsync(account2, spender)
                .should.eventually.satisfy(allowance => allowance.equals(new BigNumber(0)), `allowance should be 0`);
        });

        it('remove merchant', () => {
            return permissionManager.setRolAsync(merchant, 0, {
                from: admin,
                gas: gas
            });
        });
    });

    describe('set/get allowance as non admin/merchant', () => {
        it('setAllowance should be rejected', () => {
            const promise = bsTokenData.setAllowanceAsync(account2, spender, amount, {
                from: account2,
                gas: gas
            });

            return promise.should.eventually.be.rejected;
        });

        it('check allowance', () => {
            return bsTokenData.getAllowanceAsync(account2, spender)
                .should.eventually.satisfy(allowance => allowance.equals(new BigNumber(0)), `allowance should be 0`);
        });
    });

    describe('transferOwnership', () => {
        it('add admin as non admin', () => {
            return permissionManager.setRolAsync(account2, 1, {
                from: account2,
                gas: gas
            }).should.eventually.be.rejected;
        });

        it('check admin status', () => {
            return permissionManager.getRolAsync(account2)
                .should.eventually.satisfy(rol => rol.equals(new BigNumber(0)), `rol should be 0`);
        });

        it('add admin as admin', () => {
            return permissionManager.setRolAsync(account2, 1, {
                from: admin,
                gas: gas
            });
        });

        it('check admin status', () => {
            return permissionManager.getRolAsync(account2)
                .should.eventually.satisfy(rol => rol.equals(new BigNumber(1)), `rol should be 1`);
        });

        it('remove admin', () => {
            return permissionManager.setRolAsync(account2, 0, {
                from: admin,
                gas: gas
            });
        });
    });
});
