const QueueModel = require('../models/QueueModel');

class QueueController {
  constructor() {
    this.queueModel = new QueueModel();
  }

  async getQueue(req, res) {
    try {
      const { search, limit, offset } = req.query;
      
      let queueData = await this.queueModel.getAllQueueMembers();
      
      // Apply search filter if provided
      if (search) {
        const searchTerm = search.toLowerCase();
        queueData = queueData.filter(member =>
          member.member_name?.toLowerCase().includes(searchTerm) ||
          member.member_email?.toLowerCase().includes(searchTerm) ||
          member.memberid.toString().includes(searchTerm)
        );
      }

      // Apply pagination if provided
      const totalCount = queueData.length;
      if (limit) {
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset) || 0;
        queueData = queueData.slice(offsetNum, offsetNum + limitNum);
      }

      const statistics = await this.queueModel.getQueueStatistics();

      res.json({
        success: true,
        data: {
          queue: queueData,
          statistics,
          pagination: {
            total: totalCount,
            limit: limit ? parseInt(limit) : totalCount,
            offset: offset ? parseInt(offset) : 0
          }
        }
      });
    } catch (error) {
      console.error('Queue fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch queue data',
        message: error.message
      });
    }
  }

  async getQueueMember(req, res) {
    try {
      const { memberId } = req.params;
      
      if (!memberId) {
        return res.status(400).json({
          success: false,
          error: 'Member ID is required'
        });
      }

      const member = await this.queueModel.getQueueMemberById(parseInt(memberId));
      
      res.json({
        success: true,
        data: member
      });
    } catch (error) {
      console.error('Queue member fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch queue member',
        message: error.message
      });
    }
  }

  async getStatistics(req, res) {
    try {
      const statistics = await this.queueModel.getQueueStatistics();
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Statistics fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        message: error.message
      });
    }
  }

  async updateQueuePosition(req, res) {
    try {
      const { memberId } = req.params;
      const { newPosition } = req.body;
      
      if (!memberId || !newPosition) {
        return res.status(400).json({
          success: false,
          error: 'Member ID and new position are required'
        });
      }

      const updatedMember = await this.queueModel.updateQueuePosition(
        parseInt(memberId), 
        parseInt(newPosition)
      );
      
      res.json({
        success: true,
        data: updatedMember,
        message: 'Queue position updated successfully'
      });
    } catch (error) {
      console.error('Queue position update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update queue position',
        message: error.message
      });
    }
  }

  async addMemberToQueue(req, res) {
    try {
      const memberData = req.body;
      
      if (!memberData.memberid) {
        return res.status(400).json({
          success: false,
          error: 'Member ID is required'
        });
      }

      const newMember = await this.queueModel.addMemberToQueue(memberData);
      
      res.status(201).json({
        success: true,
        data: newMember,
        message: 'Member added to queue successfully'
      });
    } catch (error) {
      console.error('Add member to queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add member to queue',
        message: error.message
      });
    }
  }

  async removeMemberFromQueue(req, res) {
    try {
      const { memberId } = req.params;
      
      if (!memberId) {
        return res.status(400).json({
          success: false,
          error: 'Member ID is required'
        });
      }

      const removedMember = await this.queueModel.removeMemberFromQueue(parseInt(memberId));
      
      res.json({
        success: true,
        data: removedMember,
        message: 'Member removed from queue successfully'
      });
    } catch (error) {
      console.error('Remove member from queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove member from queue',
        message: error.message
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const dbStatus = await this.queueModel.supabase
        .from('queue')
        .select('count', { count: 'exact', head: true });

      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbStatus.error ? 'disconnected' : 'connected'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
}

module.exports = QueueController;