import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhnpqsbmpypdxdvdqlfq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obnBxc2JtcHlwZHhkdmRxbGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDgzMDgsImV4cCI6MjA4NzEyNDMwOH0.zjEVz-5vQy6kVJfPB81xu5VxxSWnykk5BhX2CkbfY1U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
