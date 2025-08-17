import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class TaskFlowAPITester:
    def __init__(self, base_url="https://taskmaster-261.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tokens = {}  # Store tokens for different users
        self.users = {}   # Store user data
        self.tasks = {}   # Store created tasks
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        if description:
            print(f"   Description: {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self, name, email, role, password):
        """Test user registration"""
        success, response = self.run_test(
            f"Register {role}",
            "POST",
            "auth/register",
            200,
            data={
                "name": name,
                "email": email,
                "role": role,
                "password": password
            },
            description=f"Register user {name} with role {role}"
        )
        
        if success and 'access_token' in response:
            user_id = response['user']['id']
            self.tokens[user_id] = response['access_token']
            self.users[user_id] = {
                'name': name,
                'email': email,
                'role': role,
                'role_level': response['user']['role_level'],
                'token': response['access_token']
            }
            print(f"   User ID: {user_id}, Role Level: {response['user']['role_level']}")
            return user_id
        return None

    def test_user_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password},
            description=f"Login with email {email}"
        )
        
        if success and 'access_token' in response:
            return response['access_token'], response['user']
        return None, None

    def test_get_current_user(self, token):
        """Test get current user endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            token=token,
            description="Get current user profile"
        )
        return success, response

    def test_get_users(self, token):
        """Test get all users endpoint"""
        success, response = self.run_test(
            "Get All Users",
            "GET",
            "users",
            200,
            token=token,
            description="Get list of all users"
        )
        return success, response

    def test_create_task(self, assigner_token, assignee_id, title, description, priority="medium"):
        """Test task creation"""
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data={
                "title": title,
                "description": description,
                "assigned_to": assignee_id,
                "priority": priority
            },
            token=assigner_token,
            description=f"Create task '{title}' assigned to {assignee_id}"
        )
        
        if success and 'id' in response:
            task_id = response['id']
            self.tasks[task_id] = response
            return task_id
        return None

    def test_create_task_invalid_hierarchy(self, assigner_token, assignee_id, title):
        """Test task creation with invalid hierarchy (should fail)"""
        success, response = self.run_test(
            "Create Task (Invalid Hierarchy)",
            "POST",
            "tasks",
            403,
            data={
                "title": title,
                "description": "This should fail due to hierarchy",
                "assigned_to": assignee_id,
                "priority": "medium"
            },
            token=assigner_token,
            description="Attempt to create task violating role hierarchy"
        )
        return success

    def test_get_tasks(self, token):
        """Test get tasks endpoint"""
        success, response = self.run_test(
            "Get Tasks",
            "GET",
            "tasks",
            200,
            token=token,
            description="Get tasks for current user"
        )
        return success, response

    def test_get_specific_task(self, task_id, token):
        """Test get specific task endpoint"""
        success, response = self.run_test(
            "Get Specific Task",
            "GET",
            f"tasks/{task_id}",
            200,
            token=token,
            description=f"Get task details for {task_id}"
        )
        return success, response

    def test_update_task_status(self, task_id, new_status, token):
        """Test task status update"""
        success, response = self.run_test(
            "Update Task Status",
            "PATCH",
            f"tasks/{task_id}",
            200,
            data={"status": new_status},
            token=token,
            description=f"Update task {task_id} status to {new_status}"
        )
        return success, response

    def test_add_comment(self, task_id, comment_text, token):
        """Test adding comment to task"""
        success, response = self.run_test(
            "Add Comment",
            "POST",
            f"tasks/{task_id}/comments",
            200,
            data={"text": comment_text},
            token=token,
            description=f"Add comment to task {task_id}"
        )
        return success, response

def main():
    print("🚀 Starting TaskFlow API Testing...")
    print("=" * 60)
    
    tester = TaskFlowAPITester()
    
    # Test data
    timestamp = datetime.now().strftime('%H%M%S')
    test_users = [
        ("Senior Manager", f"senior.manager.{timestamp}@test.com", "senior_manager", "TestPass123!"),
        ("Manager", f"manager.{timestamp}@test.com", "manager", "TestPass123!"),
        ("Team Lead", f"team.lead.{timestamp}@test.com", "team_lead", "TestPass123!"),
        ("Senior Developer", f"senior.dev.{timestamp}@test.com", "senior_developer", "TestPass123!"),
        ("Developer", f"developer.{timestamp}@test.com", "developer", "TestPass123!"),
        ("Intern", f"intern.{timestamp}@test.com", "intern", "TestPass123!")
    ]
    
    print("\n📝 PHASE 1: User Registration & Authentication")
    print("-" * 50)
    
    # Register users
    user_ids = []
    for name, email, role, password in test_users:
        user_id = tester.test_user_registration(name, email, role, password)
        if user_id:
            user_ids.append(user_id)
        else:
            print(f"❌ Failed to register {name}")
            return 1
    
    print(f"\n✅ Successfully registered {len(user_ids)} users")
    
    # Test login with first user
    first_user = test_users[0]
    token, user_data = tester.test_user_login(first_user[1], first_user[3])
    if not token:
        print("❌ Login test failed")
        return 1
    
    # Test get current user
    success, _ = tester.test_get_current_user(token)
    if not success:
        print("❌ Get current user failed")
        return 1
    
    # Test get all users
    success, users_list = tester.test_get_users(token)
    if not success:
        print("❌ Get users failed")
        return 1
    
    print(f"✅ Found {len(users_list)} users in system")
    
    print("\n📋 PHASE 2: Task Management & Role Hierarchy")
    print("-" * 50)
    
    # Get user tokens for testing
    senior_manager_id = user_ids[0]
    manager_id = user_ids[1]
    developer_id = user_ids[4]
    intern_id = user_ids[5]
    
    senior_manager_token = tester.users[senior_manager_id]['token']
    manager_token = tester.users[manager_id]['token']
    developer_token = tester.users[developer_id]['token']
    intern_token = tester.users[intern_id]['token']
    
    # Test valid task assignments (senior to junior)
    task1_id = tester.test_create_task(
        senior_manager_token, 
        manager_id, 
        "Strategic Planning Task", 
        "Plan Q1 strategy for the team"
    )
    
    task2_id = tester.test_create_task(
        manager_token, 
        developer_id, 
        "Feature Development", 
        "Implement new user authentication feature"
    )
    
    task3_id = tester.test_create_task(
        developer_token, 
        intern_id, 
        "Code Review", 
        "Review and test the authentication module"
    )
    
    # Test invalid task assignment (junior to senior) - should fail
    tester.test_create_task_invalid_hierarchy(
        intern_token, 
        senior_manager_id, 
        "Invalid Task Assignment"
    )
    
    # Test peer-level assignment (same role level)
    task4_id = tester.test_create_task(
        developer_token, 
        developer_id,  # This should work as peer assignment
        "Peer Review Task", 
        "Review colleague's code implementation"
    )
    
    if not all([task1_id, task2_id, task3_id]):
        print("❌ Task creation failed")
        return 1
    
    print(f"✅ Successfully created {len([t for t in [task1_id, task2_id, task3_id, task4_id] if t])} tasks")
    
    print("\n🔄 PHASE 3: Task Operations")
    print("-" * 50)
    
    # Test getting tasks for different users
    success, manager_tasks = tester.test_get_tasks(manager_token)
    if success:
        print(f"✅ Manager has {len(manager_tasks)} tasks")
    
    success, developer_tasks = tester.test_get_tasks(developer_token)
    if success:
        print(f"✅ Developer has {len(developer_tasks)} tasks")
    
    # Test getting specific task
    if task1_id:
        success, task_details = tester.test_get_specific_task(task1_id, manager_token)
        if success:
            print(f"✅ Retrieved task details: {task_details.get('title', 'Unknown')}")
    
    # Test task status updates
    if task2_id:
        success, _ = tester.test_update_task_status(task2_id, "in_progress", developer_token)
        if success:
            print("✅ Updated task status to in_progress")
        
        success, _ = tester.test_update_task_status(task2_id, "completed", developer_token)
        if success:
            print("✅ Updated task status to completed")
    
    # Test adding comments
    if task1_id:
        success, _ = tester.test_add_comment(
            task1_id, 
            "Started working on the strategic planning document", 
            manager_token
        )
        if success:
            print("✅ Added comment to task")
        
        success, _ = tester.test_add_comment(
            task1_id, 
            "Please prioritize the Q1 objectives", 
            senior_manager_token
        )
        if success:
            print("✅ Added second comment to task")
    
    print("\n📊 PHASE 4: Final Verification")
    print("-" * 50)
    
    # Verify final task states
    if task1_id:
        success, final_task = tester.test_get_specific_task(task1_id, manager_token)
        if success:
            comments_count = len(final_task.get('comments', []))
            print(f"✅ Task has {comments_count} comments")
            print(f"✅ Task status: {final_task.get('status', 'unknown')}")
    
    # Print final results
    print("\n" + "=" * 60)
    print("📈 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Total tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("\n🎉 ALL TESTS PASSED! Backend API is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {tester.tests_run - tester.tests_passed} tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())