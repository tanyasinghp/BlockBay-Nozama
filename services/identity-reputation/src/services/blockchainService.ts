import { ethers } from 'ethers';
import config from '../config';
import logger from '../utils/logger';

class BlockchainService {
  private provider: ethers.Provider | null = null;
  private reputationContract: ethers.Contract | null = null;

  async initialize() {
    try {
      this.provider = new ethers.JsonRpcProvider(config.BLOCKCHAIN_RPC_URL);
      
      if (config.REPUTATION_CONTRACT_ADDRESS) {
        // Load contract ABI and create contract instance
        const reputationABI = [
          "function createIdentity(string, string, string, string) external",
          "function updateIdentity(string, string, string) external", 
          "function setVerificationStatus(address, uint8, string, string) external",
          "function submitRating(address, string, uint8, string, uint8) external",
          "function getIdentity(address) view returns (string, string, string, string, bool, uint8, uint256, uint256)",
          "function getIdentityByDID(string) view returns (address, string, string, bool, uint256)",
          "function getReputationScore(address) view returns (uint256, string, uint256)",
          "function getReputationBreakdown(address) view returns (uint256, uint256, uint256[6])",
          "function getRating(string) view returns (string, address, string, address, string, uint8, string, uint8, uint256)",
          "function getUserRatings(address) view returns (string[])",
          "function getOrderRatings(string) view returns (string[])",
          "function isIdentityRegistered(address) view returns (bool)",
          "function doesDIDExist(string) view returns (bool)",
          "function getTotalIdentities() view returns (uint256)",
          "function getTotalRatings() view returns (uint256)",
          "event IdentityCreated(address indexed userAddress, string indexed did, string name, uint256 timestamp)",
          "event IdentityUpdated(address indexed userAddress, string indexed did, uint256 timestamp)",
          "event VerificationStatusChanged(address indexed userAddress, string indexed did, uint8 oldStatus, uint8 newStatus, uint256 timestamp)",
          "event RatingSubmitted(string indexed ratingId, string indexed orderId, address indexed fromAddress, address toAddress, uint8 score, uint8 ratingType, uint256 timestamp)",
          "event ReputationScoreUpdated(address indexed userAddress, string indexed did, uint256 oldScore, uint256 newScore, uint256 timestamp)"
        ];
        
        const contractAddress = String(config.REPUTATION_CONTRACT_ADDRESS);
        this.reputationContract = new ethers.Contract(
          contractAddress,
          reputationABI,
          this.provider
        );
      }
      
      logger.info('Blockchain service initialized');
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
    }
  }

  async getIdentity(address: string) {
    if (!this.reputationContract) {
      throw new Error('Reputation contract not initialized');
    }

    try {
      const identity = await this.reputationContract.getIdentity(address);
      return {
        did: identity[0],
        name: identity[1],
        bio: identity[2], 
        avatar: identity[3],
        verified: identity[4],
        verificationStatus: Number(identity[5]), // 0=UNVERIFIED, 1=PENDING, 2=VERIFIED, 3=REVOKED
        reputationScore: Number(identity[6]),
        createdAt: Number(identity[7])
      };
    } catch (error) {
      logger.error('Error fetching identity from blockchain:', error);
      throw error;
    }
  }

  async getReputationScore(address: string): Promise<{score: number, algorithm: string, confidence: number} | null> {
    if (!this.reputationContract) {
      logger.warn('Reputation contract not available');
      return null;
    }

    try {
      const result = await this.reputationContract.getReputationScore(address);
      return {
        score: Number(result[0]),
        algorithm: result[1],
        confidence: Number(result[2])
      };
    } catch (error) {
      logger.error('Error fetching reputation score from blockchain:', error);
      return null;
    }
  }

  async syncWithBlockchain(address: string) {
    try {
      if (!this.reputationContract) {
        logger.warn('Reputation contract not available for sync');
        return null;
      }

      const [identity, reputationScore, reputationBreakdown] = await Promise.all([
        this.getIdentity(address).catch(() => null),
        this.getReputationScore(address),
        this.getReputationBreakdown(address).catch(() => null)
      ]);

      const syncData = {
        identity,
        reputationScore,
        reputationBreakdown,
        syncedAt: new Date().toISOString()
      };

      logger.info(`Synced data for ${address}:`, syncData);
      return syncData;
    } catch (error) {
      logger.error('Error syncing with blockchain:', error);
      return null;
    }
  }

  async isContractAvailable(): Promise<boolean> {
    try {
      if (!this.provider || !this.reputationContract) {
        return false;
      }

      // Try to call a view function to test connectivity
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      logger.error('Blockchain service not available:', error);
      return false;
    }
  }

  async getBlockNumber(): Promise<number | null> {
    try {
      if (!this.provider) {
        return null;
      }
      return await this.provider.getBlockNumber();
    } catch (error) {
      logger.error('Error getting block number:', error);
      return null;
    }
  }

  async validateTransaction(txHash: string): Promise<boolean> {
    try {
      if (!this.provider) {
        return false;
      }

      const tx = await this.provider.getTransaction(txHash);
      return tx !== null;
    } catch (error) {
      logger.error('Error validating transaction:', error);
      return false;
    }
  }

  async getReputationBreakdown(address: string) {
    if (!this.reputationContract) {
      throw new Error('Reputation contract not initialized');
    }

    try {
      const breakdown = await this.reputationContract.getReputationBreakdown(address);
      return {
        totalRatings: Number(breakdown[0]),
        averageScore: Number(breakdown[1]),
        scoreDistribution: {
          1: Number(breakdown[2][1]),
          2: Number(breakdown[2][2]),
          3: Number(breakdown[2][3]),
          4: Number(breakdown[2][4]),
          5: Number(breakdown[2][5])
        }
      };
    } catch (error) {
      logger.error('Error fetching reputation breakdown from blockchain:', error);
      throw error;
    }
  }

  async getUserRatings(address: string): Promise<string[]> {
    if (!this.reputationContract) {
      throw new Error('Reputation contract not initialized');
    }

    try {
      return await this.reputationContract.getUserRatings(address);
    } catch (error) {
      logger.error('Error fetching user ratings from blockchain:', error);
      throw error;
    }
  }

  async getRating(ratingId: string) {
    if (!this.reputationContract) {
      throw new Error('Reputation contract not initialized');
    }

    try {
      const rating = await this.reputationContract.getRating(ratingId);
      return {
        orderId: rating[0],
        fromAddress: rating[1],
        fromDID: rating[2],
        toAddress: rating[3],
        toDID: rating[4],
        score: Number(rating[5]),
        comment: rating[6],
        ratingType: Number(rating[7]), // 0=BUYER_TO_SELLER, 1=SELLER_TO_BUYER, 2=ADMIN_ADJUSTMENT
        createdAt: Number(rating[8])
      };
    } catch (error) {
      logger.error('Error fetching rating from blockchain:', error);
      throw error;
    }
  }

  async isIdentityRegistered(address: string): Promise<boolean> {
    if (!this.reputationContract) {
      return false;
    }

    try {
      return await this.reputationContract.isIdentityRegistered(address);
    } catch (error) {
      logger.error('Error checking identity registration:', error);
      return false;
    }
  }

  async doesDIDExist(did: string): Promise<boolean> {
    if (!this.reputationContract) {
      return false;
    }

    try {
      return await this.reputationContract.doesDIDExist(did);
    } catch (error) {
      logger.error('Error checking DID existence:', error);
      return false;
    }
  }
}

export default new BlockchainService();