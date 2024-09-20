#
# Copyright 2024 Sony Semiconductor Solutions Corp. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# 

#!/bin/bash

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
CLIENT="$parent_path/client"
GUITOOL="$parent_path/guitool"

cleanup() {
    kill $PID2 2>/dev/null
    wait $PID2 2>/dev/null
    kill $PID1 2>/dev/null
    wait $PID1 2>/dev/null
    exit 0
}

# Trap SIGTERM and SIGINT to run cleanup
trap 'cleanup' SIGTERM SIGINT

# Start the guitool and client
$GUITOOL &
PID1=$!

$CLIENT &
PID2=$!

# Wait and Cleanup if any process exits
wait -n
cleanup