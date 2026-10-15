from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import re
import json

app = FastAPI(title="乐龄出行AI助手", description="老年人出行AI语音助手后端服务", version="1.0.0")

class MessageRequest(BaseModel):
    message: str
    chat_history: list = []

class TripPlan(BaseModel):
    destination: str
    date: str = None
    time: str = None
    travel_type: str = None
    preference: str = None

@app.post("/api/chat", response_model=dict)
async def chat(request: MessageRequest):
    message = request.message
    intent = analyze_intent(message)
    
    if intent['type'] == 'trip':
        trip_plan = parse_trip_info(message, intent)
        return {
            "role": "assistant",
            "content": generate_trip_response(trip_plan),
            "trip_plan": trip_plan,
            "action": "plan_trip"
        }
    
    elif intent['type'] == 'inquiry':
        return {
            "role": "assistant",
            "content": generate_inquiry_response(message),
            "action": "inform"
        }
    
    elif intent['type'] == 'help':
        return {
            "role": "assistant",
            "content": generate_help_response(),
            "action": "help"
        }
    
    else:
        return {
            "role": "assistant",
            "content": "抱歉，我不太明白您的意思。您可以说：我想去北京、帮我订明天去医院的车、查询后天去上海的火车票。",
            "action": "unknown"
        }

@app.post("/api/plan-trip", response_model=dict)
async def plan_trip(trip_plan: TripPlan):
    routes = generate_routes(trip_plan)
    return {
        "success": True,
        "routes": routes,
        "trip_plan": trip_plan.dict()
    }

def analyze_intent(message: str) -> dict:
    patterns = {
        'trip': [
            r'去.*(北京|上海|广州|深圳|成都|杭州|西安|南京|武汉|天津|重庆|苏州|郑州|长沙|医院|车站|机场|公园|超市|商场)',
            r'(订|买|规划|安排|查).*(车票|火车票|高铁|飞机|车|行程)',
            r'(出发|启程|旅游|旅行)',
            r'我想.*(去|到|前往)'
        ],
        'inquiry': [
            r'(查询|查一下|看看|有没有).*(票|车|路线|价格)',
            r'(几点|什么时候|几点钟)',
            r'(多少钱|票价|贵不贵)',
            r'(还有|余票|有没有票)'
        ],
        'help': [
            r'(帮助|帮忙|怎么|如何|教程|使用)',
            r'(你能|你可以|你会)',
            r'(问题|不懂|不会)'
        ]
    }
    
    for intent_type, regexes in patterns.items():
        for regex in regexes:
            if re.search(regex, message):
                return {'type': intent_type, 'pattern': regex}
    
    return {'type': 'unknown'}

def parse_trip_info(message: str, intent: dict) -> dict:
    trip_plan = {
        'destination': '',
        'date': '',
        'time': '',
        'travel_type': '',
        'preference': ''
    }
    
    destinations = ['北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '南京', '武汉', '天津', '重庆', '苏州', '郑州', '长沙', '医院', '车站', '机场', '公园', '超市', '商场']
    for dest in destinations:
        if dest in message:
            trip_plan['destination'] = dest
            break
    
    date_patterns = {
        '明天': '明天',
        '后天': '后天',
        '今天': '今天',
        '大后天': '大后天',
        '下周一': '下周一',
        '下周二': '下周二',
        '下周三': '下周三',
        '下周四': '下周四',
        '下周五': '下周五',
        '周六': '周六',
        '周日': '周日'
    }
    for key, value in date_patterns.items():
        if key in message:
            trip_plan['date'] = value
            break
    
    time_patterns = {
        '早上': '08:00',
        '上午': '10:00',
        '中午': '12:00',
        '下午': '14:00',
        '晚上': '18:00',
        '夜里': '20:00'
    }
    for key, value in time_patterns.items():
        if key in message:
            trip_plan['time'] = value
            break
    
    travel_patterns = {
        '火车': 'train',
        '高铁': 'high_speed',
        '飞机': 'plane',
        '打车': 'taxi',
        '公交': 'bus',
        '地铁': 'subway'
    }
    for key, value in travel_patterns.items():
        if key in message:
            trip_plan['travel_type'] = value
            break
    
    if '快' in message or '快点' in message:
        trip_plan['preference'] = 'fast'
    elif '便宜' in message or '省钱' in message:
        trip_plan['preference'] = 'cheap'
    elif '方便' in message:
        trip_plan['preference'] = 'convenient'
    
    return trip_plan

def generate_trip_response(trip_plan: dict) -> str:
    response = "好的，我帮您规划行程！"
    
    if trip_plan['destination']:
        response += f"您想去{trip_plan['destination']}"
    else:
        response += "请问您想去哪里？"
    
    if trip_plan['date']:
        response += f"，{trip_plan['date']}出发"
    
    if trip_plan['time']:
        response += f"，{trip_plan['time']}的车"
    
    if trip_plan['travel_type']:
        type_names = {'train': '火车', 'high_speed': '高铁', 'plane': '飞机', 'taxi': '打车', 'bus': '公交', 'subway': '地铁'}
        response += f"，选择{type_names.get(trip_plan['travel_type'], trip_plan['travel_type'])}出行"
    
    if trip_plan['preference']:
        pref_names = {'fast': '最快', 'cheap': '最便宜', 'convenient': '最方便'}
        response += f"，优先选择{pref_names.get(trip_plan['preference'], trip_plan['preference'])}的方案"
    
    if not trip_plan['destination']:
        response = "请问您想去哪里呢？比如：北京、医院、车站"
    elif not trip_plan['date']:
        response += "。请问您想什么时候出发？"
    elif not trip_plan['time']:
        response += "。请问您想几点出发？"
    else:
        response += "。正在为您查询最佳路线..."
    
    return response

def generate_inquiry_response(message: str) -> str:
    responses = [
        "好的，我来帮您查询！",
        "正在为您查找相关信息...",
        "请稍等，我来帮您看看",
        "好的，让我查一下"
    ]
    
    if '几点' in message or '时间' in message:
        return "请问您想查询几点的车次？"
    elif '多少钱' in message or '票价' in message:
        return "请告诉我您想去哪里，我帮您查询票价"
    elif '有没有' in message or '余票' in message:
        return "请告诉我您的出发地和目的地，我帮您查询余票"
    
    return responses[0]

def generate_help_response() -> str:
    return """我可以帮您做这些事情：

🎯 行程规划："我想去北京看孙子"
🚄 火车票查询："帮我订明天去上海的高铁"
🚕 打车服务："帮我叫车去医院"
🏥 就医陪诊："帮我预约明天上午的医院"
🚌 公交查询："怎么坐公交去公园"

您可以直接说您的需求，我来帮您安排！"""

def generate_routes(trip_plan: TripPlan) -> list:
    routes = []
    
    if trip_plan.travel_type == 'train' or trip_plan.travel_type == 'high_speed':
        routes = [
            {
                'type': 'high_speed',
                'name': 'G101次',
                'departure': '太原南',
                'arrival': trip_plan.destination + '北',
                'departure_time': '08:00',
                'arrival_time': '12:30',
                'duration': '4小时30分',
                'price': 350,
                'seats': '二等座',
                'status': '有票'
            },
            {
                'type': 'high_speed',
                'name': 'G103次',
                'departure': '太原南',
                'arrival': trip_plan.destination + '北',
                'departure_time': '10:30',
                'arrival_time': '15:00',
                'duration': '4小时30分',
                'price': 350,
                'seats': '二等座',
                'status': '有票'
            },
            {
                'type': 'train',
                'name': 'Z101次',
                'departure': '太原',
                'arrival': trip_plan.destination,
                'departure_time': '19:00',
                'arrival_time': '次日07:00',
                'duration': '12小时',
                'price': 180,
                'seats': '硬卧',
                'status': '有票'
            }
        ]
    
    elif trip_plan.travel_type == 'plane':
        routes = [
            {
                'type': 'plane',
                'name': 'CA1234',
                'departure': '太原武宿',
                'arrival': trip_plan.destination + '首都',
                'departure_time': '09:00',
                'arrival_time': '11:00',
                'duration': '2小时',
                'price': 800,
                'seats': '经济舱',
                'status': '有票'
            },
            {
                'type': 'plane',
                'name': 'MU5678',
                'departure': '太原武宿',
                'arrival': trip_plan.destination + '虹桥',
                'departure_time': '14:00',
                'arrival_time': '16:00',
                'duration': '2小时',
                'price': 900,
                'seats': '经济舱',
                'status': '有票'
            }
        ]
    
    elif trip_plan.travel_type == 'taxi':
        routes = [
            {
                'type': 'taxi',
                'name': '快车',
                'departure': '当前位置',
                'arrival': trip_plan.destination,
                'duration': '约25分钟',
                'price': 35,
                'status': '立即接单'
            },
            {
                'type': 'taxi',
                'name': '优享',
                'departure': '当前位置',
                'arrival': trip_plan.destination,
                'duration': '约25分钟',
                'price': 45,
                'status': '立即接单'
            },
            {
                'type': 'taxi',
                'name': '专车',
                'departure': '当前位置',
                'arrival': trip_plan.destination,
                'duration': '约25分钟',
                'price': 65,
                'status': '立即接单'
            }
        ]
    
    elif trip_plan.travel_type == 'bus':
        routes = [
            {
                'type': 'bus',
                'name': '101路',
                'departure': '府西街口',
                'arrival': trip_plan.destination,
                'duration': '约40分钟',
                'price': 2,
                'stops': 12,
                'status': '运营中'
            },
            {
                'type': 'bus',
                'name': '102路',
                'departure': '鼓楼街',
                'arrival': trip_plan.destination,
                'duration': '约45分钟',
                'price': 2,
                'stops': 15,
                'status': '运营中'
            }
        ]
    
    else:
        routes = [
            {
                'type': 'high_speed',
                'name': '推荐路线',
                'departure': '太原南',
                'arrival': trip_plan.destination,
                'duration': '约4小时',
                'price': 350,
                'status': '推荐'
            },
            {
                'type': 'train',
                'name': '经济路线',
                'departure': '太原',
                'arrival': trip_plan.destination,
                'duration': '约12小时',
                'price': 180,
                'status': '经济'
            }
        ]
    
    return routes

@app.get("/")
async def root():
    return {"message": "乐龄出行AI助手后端服务运行中"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)