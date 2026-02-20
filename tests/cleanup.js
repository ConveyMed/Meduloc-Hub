// Cleanup script - ONLY DELETES [PLAYWRIGHT] test data
// Run with: node tests/cleanup.js

const { createClient } = require('@supabase/supabase-js');

// Load env from .env file
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('Cleaning up [PLAYWRIGHT] test data...\n');

  // Delete notifications (updates/events) with [PLAYWRIGHT] prefix
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('id, title')
    .like('title', '[PLAYWRIGHT]%');

  if (notifError) {
    console.error('Error fetching notifications:', notifError);
  } else if (notifications && notifications.length > 0) {
    console.log(`Found ${notifications.length} [PLAYWRIGHT] notifications to delete`);

    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .like('title', '[PLAYWRIGHT]%');

    if (deleteError) {
      console.error('Error deleting notifications:', deleteError);
    } else {
      console.log(`Deleted ${notifications.length} notifications`);
    }
  } else {
    console.log('No [PLAYWRIGHT] notifications found');
  }

  // Delete library content with [PLAYWRIGHT] prefix
  const { data: content, error: contentError } = await supabase
    .from('library_content')
    .select('id, title')
    .like('title', '[PLAYWRIGHT]%');

  if (contentError) {
    console.error('Error fetching content:', contentError);
  } else if (content && content.length > 0) {
    console.log(`Found ${content.length} [PLAYWRIGHT] content items to delete`);

    const { error: deleteError } = await supabase
      .from('library_content')
      .delete()
      .like('title', '[PLAYWRIGHT]%');

    if (deleteError) {
      console.error('Error deleting content:', deleteError);
    } else {
      console.log(`Deleted ${content.length} content items`);
    }
  } else {
    console.log('No [PLAYWRIGHT] content found');
  }

  // Delete library categories with [PLAYWRIGHT] prefix
  const { data: categories, error: catError } = await supabase
    .from('library_categories')
    .select('id, name')
    .like('name', '[PLAYWRIGHT]%');

  if (catError) {
    console.error('Error fetching categories:', catError);
  } else if (categories && categories.length > 0) {
    console.log(`Found ${categories.length} [PLAYWRIGHT] categories to delete`);

    const { error: deleteError } = await supabase
      .from('library_categories')
      .delete()
      .like('name', '[PLAYWRIGHT]%');

    if (deleteError) {
      console.error('Error deleting categories:', deleteError);
    } else {
      console.log(`Deleted ${categories.length} categories`);
    }
  } else {
    console.log('No [PLAYWRIGHT] categories found');
  }

  console.log('\nCleanup complete!');
}

cleanup().catch(console.error);
