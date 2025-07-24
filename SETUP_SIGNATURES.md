# Setting Up Signature Collection & Display

Your site now has a complete signature system with **collection AND display** functionality! 

## Current Setup: Mock Data Mode

The site is currently running in **mock data mode** for demonstration purposes. It includes:
- ✅ Fully functional form with validation
- ✅ Sample signatures for demonstration  
- ✅ Local storage for testing new signatures
- ✅ Professional design and user experience
- ✅ Real-time signature count and display

## Option 1: Airtable Backend (Recommended)

Airtable provides an easy way to store signatures and display them on your site.

### Step 1: Create Airtable Base

1. Go to [airtable.com](https://airtable.com) and create a free account
2. Create a new base called "UniMelb CS Letter Signatures"
3. Rename the default table to "Signatures"
4. Set up these columns:
   - **Name** (Single line text)
   - **Email** (Email)
   - **Program** (Single line text)
   - **Status** (Single select: Current Student, Graduate, Staff, Other)
   - **Comments** (Long text)
   - **Public Consent** (Checkbox)
   - **Timestamp** (Date and time)

### Step 2: Get API Credentials

1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Create a new Personal Access Token with these scopes:
   - `data.records:read`
   - `data.records:write`
3. Add your base to the token
4. Copy the token (keep it secure!)

### Step 3: Configure Your Site

1. Open `script.js` in your project
2. Replace the configuration values:
   ```javascript
   const AIRTABLE_CONFIG = {
       baseId: 'appXXXXXXXXXXXXXX', // From your Airtable URL
       tableName: 'Signatures',
       apiKey: 'patXXXXXXXXXXXXXX', // Your Personal Access Token
       viewName: 'Grid view'
   };
   
   const USE_MOCK_DATA = false; // Change to false
   ```
3. To find your `baseId`: Look at your Airtable URL - it's the part that starts with `app`

### Step 4: Test and Deploy

1. Test locally to ensure signatures are being saved and displayed
2. Deploy your site to your hosting provider
3. Share the URL!

## Option 2: Alternative Backends

### Google Sheets + Apps Script
- More complex setup but free
- Requires Apps Script knowledge
- Good for advanced users

### Netlify Forms
- Easy for Netlify hosting
- Limited display options without additional work
- Good for simple collection

### Custom Backend
- Full control over data
- Requires server setup and maintenance
- Overkill for most use cases

## Form Features

Your current form includes:

### Required Fields
- **Full Name**: Person's complete name
- **Program/Year**: e.g., "MCS 2023", "PhD Computer Science"
- **Email**: For verification and potential follow-up
- **Public Consent**: Required checkbox for displaying signature

### Optional Fields  
- **Status**: Current Student, Graduate, Staff, Other
- **Comments**: Personal experiences or additional concerns

### Security Features
- ✅ HTML escaping to prevent XSS attacks
- ✅ Form validation and error handling
- ✅ Rate limiting (when using Airtable)
- ✅ Email collection for potential verification

## Signature Display Features

- **Real-time count**: Shows total number of signatures
- **Paginated display**: Loads 20 signatures at a time
- **Professional cards**: Each signature shown in styled card
- **Mobile responsive**: Works on all devices
- **Load more**: Button to show additional signatures
- **Comments display**: Shows personal experiences when provided

## Privacy & Legal Considerations

- Only display signatures with explicit consent
- Store emails securely for potential verification
- Consider adding a privacy policy
- Ensure GDPR compliance if needed
- Regular backup of signature data

## Customization Options

### Styling
- Modify `styles.css` to match your design preferences
- Change colors, fonts, spacing as needed
- Add your university branding if desired

### Functionality
- Adjust `loadMoreSize` in `script.js` to show more/fewer signatures per page
- Modify form fields in HTML to collect different data
- Add email notifications when new signatures are added

## Troubleshooting

### Signatures Not Displaying
1. Check browser console for errors
2. Verify Airtable API credentials
3. Ensure base and table names match exactly
4. Check that records have `Public Consent` checked

### Form Not Submitting
1. Verify API token has write permissions
2. Check network tab for API errors
3. Ensure all required fields are filled
4. Try in different browser/incognito mode

### Local Development
- Use `python -m http.server 8000` to test locally
- Mock data mode works without any external services
- Test form submission and signature display

## Going Live Checklist

- [ ] Configure Airtable with correct fields
- [ ] Set up API token with proper permissions
- [ ] Update `script.js` with real credentials
- [ ] Set `USE_MOCK_DATA = false`
- [ ] Test form submission and display
- [ ] Deploy to hosting provider
- [ ] Test on live site
- [ ] Share with your community!

## Support

For issues with this signature system:
1. Check the browser console for error messages
2. Verify your Airtable setup matches the instructions
3. Test with mock data first to isolate issues
4. Join the Discord community for help: https://discord.gg/MXqbgYWK82 