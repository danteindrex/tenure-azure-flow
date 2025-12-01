import { Request, Response } from 'express';
import QueueModel from '../models/QueueModel';
import { pool } from '../../drizzle/db';

class QueueController {
  private queueModel: QueueModel;

  constructor() {
    this.queueModel = new QueueModel();
  }

  async getQueue(req: Request, res: Response): Promise<void> {
    try {
      const { search, limit, offset, currentPosition } = req.query;

      let queueData = await this.queueModel.getAllQueueMembers();
      const totalCount = queueData.length;

      // Apply search filter if provided
      if (search && typeof search === 'string') {
        const searchTerm = search.toLowerCase();
        queueData = queueData.filter((member: any) =>
          member.full_name?.toLowerCase().includes(searchTerm) ||
          member.first_name?.toLowerCase().includes(searchTerm) ||
          member.last_name?.toLowerCase().includes(searchTerm) ||
          member.email?.toLowerCase().includes(searchTerm) ||
          member.user_id?.toString().includes(searchTerm) ||
          member.membership_id?.toString().includes(searchTerm)
        );
      }

      // If currentPosition is provided, return only nearest 5 users (2 above, current, 2 below)
      if (currentPosition) {
        const currentPos = parseInt(currentPosition as string);
        const startPos = Math.max(1, currentPos - 2);
        const endPos = Math.min(totalCount, currentPos + 2);
        
        queueData = queueData.filter((member: any) => 
          member.queue_position >= startPos && member.queue_position <= endPos
        );
      } else if (limit) {
        // Apply pagination if provided and no currentPosition
        const limitNum = parseInt(limit as string);
        const offsetNum = parseInt(offset as string) || 0;
        queueData = queueData.slice(offsetNum, offsetNum + limitNum);
      }

      // Return position, user_id, and member_status for display
      const sanitizedQueue = queueData.map((member: any) => ({
        queue_position: member.queue_position,
        user_id: member.user_id,
        id: member.id,
        member_status: member.member_status || 'Active',
        is_eligible: member.is_eligible || false
      }));

      console.log('📊 Returning queue data:');
      console.log('   Total members in queue:', totalCount);
      console.log('   Members returned:', sanitizedQueue.length);
      if (currentPosition) {
        console.log('   Filtered for position:', currentPosition);
      }
      console.log('   Queue data:', JSON.stringify(sanitizedQueue, null, 2));

      const statistics = await this.queueModel.getQueueStatistics();

      res.json({
        success: true,
        data: {
          queue: sanitizedQueue,
          statistics,
          pagination: {
            total: totalCount,
            limit: limit ? parseInt(limit as string) : sanitizedQueue.length,
            offset: offset ? parseInt(offset as string) : 0,
            filtered: !!currentPosition
          }
        }
      });
    } catch (error: any) {
      console.error('Queue fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch queue data',
        message: error.message
      });
    }
  }

  async getQueueMember(req: Request, res: Response): Promise<void> {
    try {
      const { memberId } = req.params;

      if (!memberId) {
        res.status(400).json({
          success: false,
          error: 'Member ID is required'
        });
        return;
      }

      const member = await this.queueModel.getQueueMemberById(memberId);

      res.json({
        success: true,
        data: member
      });
    } catch (error: any) {
      console.error('Queue member fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch queue member',
        message: error.message
      });
    }
  }

  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await this.queueModel.getQueueStatistics();

      res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      console.error('Statistics fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        message: error.message
      });
    }
  }

  async updateQueuePosition(req: Request, res: Response): Promise<void> {
    try {
      const { memberId } = req.params;
      const { newPosition } = req.body;

      if (!memberId || !newPosition) {
        res.status(400).json({
          success: false,
          error: 'Member ID and new position are required'
        });
        return;
      }

      const updatedMember = await this.queueModel.updateQueuePosition(
        memberId,
        parseInt(newPosition)
      );

      res.json({
        success: true,
        data: updatedMember,
        message: 'Queue position updated successfully'
      });
    } catch (error: any) {
      console.error('Queue position update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update queue position',
        message: error.message
      });
    }
  }

  async addMemberToQueue(req: Request, res: Response): Promise<void> {
    try {
      const memberData = req.body;

      if (!memberData.memberid) {
        res.status(400).json({
          success: false,
          error: 'Member ID is required'
        });
        return;
      }

      const newMember = await this.queueModel.addMemberToQueue(memberData);

      res.status(201).json({
        success: true,
        data: newMember,
        message: 'Member added to queue successfully'
      });
    } catch (error: any) {
      console.error('Add member to queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add member to queue',
        message: error.message
      });
    }
  }

  async removeMemberFromQueue(req: Request, res: Response): Promise<void> {
    try {
      const { memberId } = req.params;

      if (!memberId) {
        res.status(400).json({
          success: false,
          error: 'Member ID is required'
        });
        return;
      }

      const removedMember = await this.queueModel.removeMemberFromQueue(memberId);

      res.json({
        success: true,
        data: removedMember,
        message: 'Member removed from queue successfully'
      });
    } catch (error: any) {
      console.error('Remove member from queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove member from queue',
        message: error.message
      });
    }
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Simple health check using pool query
      await pool.query('SELECT 1');

      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message
      });
    }
  }
}

export default QueueController;
