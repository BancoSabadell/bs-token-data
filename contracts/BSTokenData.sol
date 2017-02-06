pragma solidity ^0.4.2;

import "PermissionManager.sol";

contract BSTokenData {
    string public standard = 'BSToken 0.1';
    string public name = 'BSToken';
    string public symbol = 'BST';
    uint8 public decimals = 2;

    struct Account {
        uint256 balance;
        mapping (address => uint256) allowance;
    }

    /* Total token supply */
    uint256 public totalSupply;
    /* Accounts or "wallets" */
    mapping (address => Account) public accounts;

    PermissionManager pm;

    function BSTokenData(address permissionManagerAddress) {
        pm = PermissionManager(permissionManagerAddress);
    }

    function setBalance(address account, uint256 balance) onlyAdminOrMerchants stopInEmergency {
        accounts[account].balance = balance;
    }

    function getBalance(address account) constant returns (uint256) {
        return accounts[account].balance;
    }

    function setTotalSupply(uint256 aTotalSupply) onlyAdminOrMerchants stopInEmergency {
        totalSupply = aTotalSupply;
    }

    function getTotalSupply() constant returns (uint256) {
        return totalSupply;
    }

    function setAllowance(address account, address spender, uint256 amount) onlyAdminOrMerchants stopInEmergency {
        accounts[account].allowance[spender] = amount;
    }

    function getAllowance(address account, address spender) constant returns (uint256) {
        return accounts[account].allowance[spender];
    }

    function frozenAccount(address account) constant returns (bool) {
        return (pm.getRol(account) == 3);
    }

    function frozenAccountForMerchant(address account) constant returns (bool) {
        return pm.getRelationship(account, this, 1);
    }

    function isMerchant(address account) constant returns(bool) {
        return pm.getRelationship(account, this, 0);
    }

    modifier onlyAdmin {
        if (!pm.getNetworkAdmin(pm.getRol(msg.sender))) throw;
        _;
    }

    modifier onlyAdminOrMerchants {
        if (!pm.getNetworkAdmin(pm.getRol(msg.sender)) && !pm.getRelationship(msg.sender, this, 0))
            throw;
        _;
    }

    modifier stopInEmergency {
        if (pm.getRol(this) == 4) throw;
        _;
    }
}
