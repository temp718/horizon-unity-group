# Horizon Unit - User & Admin Quick Start Guide

## For Members (Users)

### Viewing Your Balance
1. Log in to your member dashboard
2. Look for the **eye icon** next to your balance
3. **Closed eye (EyeOff):** Balance is hidden - click to reveal
4. **Open eye:** Balance is visible - click to hide
5. Your balance displays as hidden dots (●●●●●●●●●●) when private

### Making Contributions
1. Click the **"Add Today"** button to record daily contribution
2. Default contribution is 100 KES (admin may adjust this)
3. View your contribution calendar to track daily payments
4. Monthly summary shows total contributed this month

### Viewing Your Savings
1. **Total Savings:** Shows all contributions + any admin adjustments
2. **This Month:** Shows current month's contributions
3. **Recent Activity:** View your last 10 contributions

## For Admins

### Accessing Member Management
1. Log in to admin dashboard
2. Scroll down to **"Members"** section
3. View all members and their statistics
4. **Search:** Use search box to find member by name or phone

### Managing Individual Member
1. Click on any member row to open their detail page
2. You'll see:
   - **Total Balance** breakdown
   - **Contribution History**
   - **Adjustment History**
   - **Control Buttons** for operations

### Controlling Balance Visibility
**To hide/reveal member's balance:**
1. In member detail page, click **"Show to User"** or **"Hide from User"** button
2. Dialog appears confirming action
3. Click **"Reveal Balance"** or **"Hide Balance"**
4. Badge in member list shows current status

**Use cases:**
- Hide balance during contribution month → Reveal at month end for excitement
- Reveal immediately if member requests
- Hide if tracking sensitive financial data

### Adjusting Member Balance
1. Click **"Add Balance"** button
2. Select **Type:** Add or Deduct
3. Enter **Amount** in KES
4. (Optional) Enter **Reason** (e.g., "Bonus", "Penalty", "Emergency withdrawal")
5. Click **Submit**
6. Adjustment appears in history with timestamp and reason

**Examples:**
- Add 500 KES → Member contributed extra offline
- Deduct 200 KES → Penalty for missed contributions
- Add 1000 KES → Reason: "Month-end bonus"

### Adjusting Contribution Amount
1. Click **"Contribution"** button
2. Dialog shows current daily amount
3. Enter new daily amount
4. Click **Update**
5. Future contributions use new amount

**Examples:**
- Increase 100 → 150 KES (member wants to save more)
- Decrease 200 → 150 KES (member facing hardship)

### Sending Messages to Member
1. Click **"Message"** button
2. Type your message in the text area
3. Click **Send**
4. Message is recorded for audit trail

**Examples:**
- "Great saving this month! Keep it up!"
- "We're revealing balances tomorrow at 6 PM. Exciting news!"
- "Need help? Your contribution adjusted to 50 KES for this month."

### Deleting Contributions
1. In contribution history, find the incorrect entry
2. Hover and click **delete icon** (trash bin)
3. Confirm deletion
4. Contribution removed from total

**Use cases:**
- Data entry errors
- Duplicate entries
- Contributions marked incorrectly

## Dashboard Navigation

### User Dashboard
```
Header: Profile name, Logout
↓
Balance Card: Show/Hide toggle
↓
Quick Actions: Add today, Contribution rate
↓
Monthly Stats: Count and total
↓
Calendar View: Contribution tracker
↓
Recent Activity: Last 10 contributions
```

### Admin Dashboard
```
Header: Admin badge, Logout
↓
Statistics: Members, Total Savings, Monthly Total, Contributions
↓
Search Box: Find members
↓
Member List: All members with stats, click to detail
↓
Recent Contributions: Activity feed
```

### Admin Member Detail
```
Header: Member name, phone, Back button
↓
Balance Overview: Total, contributions, adjustments
↓
Action Buttons: Add Balance, Contribution, Message, Visibility
↓
Adjustment History: All balance changes
↓
Contribution History: All contributions with delete option
```

## Common Tasks

### Task: Onboard New Member
1. Member registers with phone number
2. Account created automatically
3. Default balance: hidden
4. Default contribution: 100 KES
5. Admin can adjust either

### Task: Month-End Balance Reveal
1. Go to Admin Dashboard
2. For each member, click their name
3. Click **"Show to User"** or **"Hide from User"**
4. Click **"Reveal Balance"**
5. Repeat for all or customize per member

### Task: Handle Missed Payment
1. Identify member who didn't contribute
2. Open their detail page
3. Click **"Add Balance"** 
4. Deduct: 200 KES (2x daily rate as penalty)
5. Reason: "Missed contribution - penalty"
6. Click **"Message"**
7. Send: "Your contribution was missed yesterday. 200 KES penalty applied. Next payment: double rate. Let's keep the momentum!"

### Task: Emergency Financial Help
1. Member requests reduced payment
2. Open their detail page
3. Click **"Contribution"**
4. Change from 100 KES to 50 KES
5. Click **Update**
6. Send message explaining temporary reduction

### Task: Bonus Distribution
1. Decide on bonus (e.g., 500 KES per member)
2. For each member:
   - Open detail page
   - Click **"Add Balance"**
   - Type 500, Reason: "Year-end bonus"
   - Click Submit
3. Members see balances increase when you reveal them

## Tips & Tricks

### Balance Visibility Strategy
- Keep hidden during contribution month (builds anticipation)
- Reveal on month-end (creates celebration moment)
- Creates psychological boost to see accumulated savings
- Increases member engagement

### Communication Best Practices
- Send friendly reminders for missed payments
- Celebrate milestones (100K saved, 1 year member, etc.)
- Be transparent about penalties and reasons
- Acknowledge member hardship with flexible terms

### Record Keeping
- Always add reason for balance adjustments
- Keep messages for audit trail
- Document special circumstances
- Use adjustment history for reporting

### Member Retention
- Regular communication improves engagement
- Flexible contribution amounts build trust
- Transparent balance management builds confidence
- Celebrate member achievements

## Troubleshooting

### Member Can't See Balance
- Check if balance is hidden (you set it)
- If revealed, check member's browser cache
- Try logging out and back in

### Contribution Not Appearing
- Check if user already contributed today
- Verify contribution date is today
- Check contribution history in detail page

### Balance Math Doesn't Match
- Total = All contributions + All adjustments
- Check adjustments tab for hidden balance changes
- Add up individual contributions to verify

### Can't Find Member
- Use search by exact phone number
- Try first name search
- Check if member is fully registered
- Verify member exists in system

## Security Notes
- Admin credentials never shared with members
- Balance adjustments are auditable (reason recorded)
- All actions tied to admin ID
- Member data is private (only accessible by that member or admin)
- Messages stored for record-keeping

## Support
For technical issues:
1. Check member account exists
2. Verify admin has correct permissions
3. Review recent changes in adjustment history
4. Check messages sent to member

---

**Version:** 1.0
**Last Updated:** February 2, 2026
