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
          "function getSellerProfile(address) view returns (uint256, uint8, uint256, bool, uint256, string)",
          "function registerSeller(string) external",
          "function submitReview(address, uint256, uint8, string) external",
          "function verifyIdentity(address, string) external",
          "function getReputationScore(address) view returns (uint256)",
          "event IdentityVerified(address indexed account, string did)",
          "event ReviewSubmitted(address indexed seller, address indexed buyer, uint256 orderId, uint8 rating)"
        ];
        
        this.reputationContract = new ethers.Contract(
          config.REPUTATION_CONTRACT_ADDRESS,
          reputationABI,
          this.provider
        );
      }
      
      logger.info('Blockchain service initialized');
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
    }
  }

  async getSellerProfile(address: string) {
    if (!this.reputationContract) {
      throw new Error('Reputation contract not initialized');
    }

    try {
      const profile = await this.reputationContract.getSellerProfile(address);
      return {
        totalReviews: Number(profile[0]),
        averageRating: Number(profile[1]),
        totalSales: Number(profile[2]),
        isVerified: profile[3],
        memberSince: Number(profile[4]),
        did: profile[5]
      };
    } catch (error) {
      logger.error('Error fetching seller profile from blockchain:', error);
      throw error;
    }
  }

  async getReputationScore(address: string): Promise<number | null> {
    if (!this.reputationContract) {
      logger.warn('Reputation contract not available');
      return null;
    }

    try {
      const score = await this.reputationContract.getReputationScore(address);
      return Number(score);
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

      const [profile, reputationScore] = await Promise.all([
        this.getSellerProfile(address).catch(() => null),
        this.getReputationScore(address)
      ]);

      const syncData = {
        profile,
        reputationScore,
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
}

export default new BlockchainService();