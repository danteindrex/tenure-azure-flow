/**
 * Approval Workflow Demo
 * 
 * Demonstrates the approval manager service functionality
 * This is an example file showing how to use the service
 */

import { approvalManagerService } from '../src/services/approval-manager.service'

async function demonstrateApprovalWorkflow() {
  console.log('=== Approval Workflow Demo ===\n')

  // 1. Check approval requirements for different amounts
  console.log('1. Checking approval requirements:')
  console.log(`   $50,000 requires approval: ${approvalManagerService.requiresApproval(50000)}`)
  console.log(`   $100,000 requires approval: ${approvalManagerService.requiresApproval(100000)}`)
  console.log(`   $150,000 requires approval: ${approvalManagerService.requiresApproval(150000)}`)
  console.log()

  // 2. Get required approval counts
  console.log('2. Required approval counts:')
  console.log(`   $50,000 needs ${approvalManagerService.getRequiredApprovalCount(50000)} approval(s)`)
  console.log(`   $100,000 needs ${approvalManagerService.getRequiredApprovalCount(100000)} approval(s)`)
  console.log(`   $150,000 needs ${approvalManagerService.getRequiredApprovalCount(150000)} approval(s)`)
  console.log()

  // 3. Check approval permissions
  console.log('3. Checking approval permissions:')
  console.log(`   'admin' can approve: ${approvalManagerService.canApprove('admin')}`)
  console.log(`   'finance_manager' can approve: ${approvalManagerService.canApprove('finance_manager')}`)
  console.log(`   'user' can approve: ${approvalManagerService.canApprove('user')}`)
  console.log(`   'viewer' can approve: ${approvalManagerService.canApprove('viewer')}`)
  console.log()

  // 4. Get threshold configuration
  console.log('4. Approval threshold configuration:')
  const threshold = approvalManagerService.getApprovalThreshold()
  console.log(`   Amount threshold: $${threshold.amount.toLocaleString()}`)
  console.log(`   Required approvals: ${threshold.requiredApprovals}`)
  console.log(`   Allowed roles: ${threshold.allowedRoles.join(', ')}`)
  console.log()

  // 5. Demonstrate workflow initialization (would require database)
  console.log('5. Workflow initialization example:')
  console.log('   // Initialize workflow for a payout')
  console.log('   const workflow = await approvalManagerService.initializeApproval("payout-123")')
  console.log('   // Returns:')
  console.log('   // {')
  console.log('   //   requiredApprovals: 2,')
  console.log('   //   currentApprovals: 0,')
  console.log('   //   approvers: [],')
  console.log('   //   status: "pending",')
  console.log('   //   createdAt: Date')
  console.log('   // }')
  console.log()

  console.log('=== Demo Complete ===')
}

// Run the demo
demonstrateApprovalWorkflow().catch(console.error)

