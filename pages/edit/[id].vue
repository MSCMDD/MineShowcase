<script setup lang="ts">
import { reactive, onMounted, ref, watch, markRaw } from 'vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { message, notification } from 'ant-design-vue'
import {
    CloudOffline,
    CloudDownloadOutline,
    CloudDone,
} from '@vicons/ionicons5'
import { useRequest } from 'alova/client'
import DynamicTags from '@/components/Common/DynamicTags/DynamicTags.vue'
import { ServerAPI_Token, fetch_status } from '@/api'
import type { Fetch_Status, StatusWithUser } from '@/api/models'
import Img404 from '@/assets/error.webp'
import { useDebounceFn } from '@vueuse/core'

const title = useState<string>('pageTitle')
title.value = '编辑'
useHead({
    title: title,
})

// 路由和通知
const route = useRoute()
const ServerID = route.params.id
const hasDraft = ref(false) // 新增草稿状态标记
const hasPermission = ref(false) // 新增权限状态

// 服务器信息状态
const serverInfo = reactive({
    name: '',
    ip: '',
    desc: '加载中...',
    tags: [] as string[],
    version: '',
    link: '',
    loading: true,
    error: undefined as string | undefined,
    code: 200,
})
// 服务器状态检测
const serverStatus = reactive({
    color: 'processing',
    icon: markRaw(CloudDownloadOutline), // 初始化时标记
    text: '检测中...',
    loading: false,
})

const loadDraft = async () => {
    const key = `draft-${ServerID}`
    const draft = localStorage.getItem(key)
    if (draft) {
        try {
            const parsed = JSON.parse(draft)
            // 先验证权限
            const response = await refreshServerInfo()

            if (response.code === 200) {
                // 有权限时才加载草稿
                serverInfo.name = parsed.name || serverInfo.name
                serverInfo.ip = parsed.ip || serverInfo.ip
                serverInfo.desc = parsed.desc || serverInfo.desc
                serverInfo.tags = parsed.tags || serverInfo.tags
                serverInfo.version = parsed.version || serverInfo.version
                serverInfo.link = parsed.link || serverInfo.link
                hasDraft.value = true
                hasPermission.value = true
            } else {
                // 没有权限时清除草稿
                localStorage.removeItem(key)
                hasDraft.value = false
                hasPermission.value = false
            }
        } catch (e) {
            console.error('加载草稿失败:', e)
            localStorage.removeItem(key)
        }
    }
}

const clearDraft = async () => {
    const response = await refreshServerInfo()
    try {
        if (response.code === 200) {
            localStorage.removeItem(`draft-${ServerID}`)
            hasDraft.value = false
            serverInfo.name = response.name
            serverInfo.ip = response.ip
            serverInfo.desc = response.desc
            serverInfo.tags = response.tags
            serverInfo.version = response.version
            serverInfo.link = response.link

            message.success('草稿已清除，恢复最新数据')
        } else {
            message.error('清除草稿失败：权限验证未通过')
        }
    } catch (error) {
        message.error('清除草稿失败')
    }
}

const { send: PutServerInfo } = useRequest(
    ({
        name,
        ip,
        desc,
        tags,
        version,
        link,
    }: {
        name: string
        ip: string
        desc: string
        tags: string[]
        version: string
        link: string
    }) =>
        ServerAPI_Token.Put<StatusWithUser>(`/v1/servers/${ServerID}`, {
            name,
            ip,
            desc,
            tags,
            version,
            link,
        }),
    {
        immediate: false, // 禁用自动请求
        initialData: {},
        retry: 3,
    },
)

// 保存服务器信息
const saveServerInfo = async () => {
    serverInfo.loading = true
    try {
        const response = await PutServerInfo({
            name: serverInfo.name,
            ip: serverInfo.ip,
            desc: serverInfo.desc,
            tags: serverInfo.tags,
            version: serverInfo.version,
            link: serverInfo.link,
        })
        if (response.code === 200) {
            await clearDraft()
            notification.success({
                message: '保存成功',
                description: '服务器信息已保存',
            })
        } else {
            message.error('保存失败：' + response.detail)
        }
    } catch (error) {
        message.error('保存失败：' + error)
    } finally {
        serverInfo.loading = false
    }
}

const {
    send: refreshServerInfo,
    onSuccess,
    onError,
} = useRequest(
    () =>
        ServerAPI_Token.Get<StatusWithUser>(`/v1/servers/${ServerID}/editor`, {
            cacheFor: null,
        }),
    {
        immediate: false, // 禁用自动请求
        initialData: {},
        retry: 3,
    },
)
onSuccess(({ data }) => {
    // 更新表单为服务器最新数据
    serverInfo.name = data.name
    serverInfo.ip = data.ip
    serverInfo.desc = data.desc
    serverInfo.tags = data.tags
    serverInfo.loading = false
    serverInfo.version = data.version
    serverInfo.link = data.link
    // 清除草稿缓存
    localStorage.removeItem(`draft-${ServerID}`)
    hasDraft.value = false
    checkServerStatus(serverInfo.ip)
})
onError(() => {
    serverInfo.error = '网站的妈妈叫后端吃饭去了...请稍后再试'
    serverInfo.code = 502
    serverInfo.loading = false
})

const { send: statusResponse } = useRequest(
    (ip) =>
        fetch_status.Get<Fetch_Status>(`?ip=${ip}`, {
            cacheFor: null,
        }),
    { immediate: false },
)

const checkServerStatus = useDebounceFn(async (ip: string) => {
    if (!ip) return

    serverStatus.loading = true
    try {
        serverStatus.color = 'processing'
        serverStatus.icon = markRaw(CloudDownloadOutline) // 动态赋值时标记
        serverStatus.text = '检测中...'
        updateServerStatus(await statusResponse(serverInfo.ip))
    } catch (err) {
        serverStatus.color = 'error'
        serverStatus.text = '检测失败'
    } finally {
        serverStatus.loading = false
    }
}, 1000)

const updateServerStatus = (data: Fetch_Status) => {
    if (data.online) {
        serverStatus.color = 'success'
        serverStatus.icon = markRaw(CloudDone) // 动态赋值时标记
        serverStatus.text = `在线 - ${data.players.online}/${data.players.max} 玩家`
    } else {
        serverStatus.color = 'error'
        serverStatus.icon = markRaw(CloudOffline) // 动态赋值时标记
        serverStatus.text = '离线'
    }
}

const autoSave = useDebounceFn(() => {
    const draftData = {
        name: serverInfo.name,
        ip: serverInfo.ip,
        desc: serverInfo.desc,
        tags: serverInfo.tags,
        version: serverInfo.version,
        link: serverInfo.link,
    }
    localStorage.setItem(`draft-${ServerID}`, JSON.stringify(draftData))
    message.success('草稿已自动保存', 2)
    hasDraft.value = true
}, 3000)

const manualSave = () => {
    const draftData = {
        name: serverInfo.name,
        ip: serverInfo.ip,
        desc: serverInfo.desc,
        tags: serverInfo.tags,
        version: serverInfo.version,
        link: serverInfo.link,
    }
    localStorage.setItem(`draft-${ServerID}`, JSON.stringify(draftData))
    message.success('草稿已保存', 2)
}

onMounted(async () => {
    let response: StatusWithUser | undefined = undefined

    // 加载草稿
    await loadDraft()

    if (hasDraft.value) {
        // 有草稿时直接使用本地数据
        serverInfo.loading = false
        checkServerStatus(serverInfo.ip)
    } else {
        // 没有草稿时获取服务器数据
        response = await refreshServerInfo()
        if (response.code === 200) {
            hasPermission.value = true
        }
    }

    // 处理错误状态
    if (response && response.code === 401) {
        serverInfo.error = response.detail
        serverInfo.loading = false
        serverInfo.code = 401
    }

    // 如果有权限，监听表单变化
    if (hasPermission.value) {
        watch(
            [
                () => serverInfo.name,
                () => serverInfo.desc,
                () => serverInfo.ip,
                () => serverInfo.tags,
                () => serverInfo.version,
                () => serverInfo.link,
            ],
            autoSave,
        )

        watch(
            () => serverInfo.ip,
            useDebounceFn((newIp) => {
                checkServerStatus(newIp)
            }, 1000),
        )
    }
})

const isDarkMode = useState<boolean>('isDarkMode')
</script>

<template>
    <div class="edit">
        <a-spin :spinning="serverInfo.loading">
            <div class="content-container">
                <div v-if="serverInfo.error" class="error-container">
                    <a-result :title="serverInfo.error">
                        <template #icon>
                            <img
                                :src="Img404"
                                style="width: 50%; height: 50%"
                            />
                        </template>
                        <template #extra>
                            <a-button
                                @click="$router.back()"
                                v-if="serverInfo.code == 401"
                            >
                                返回
                            </a-button>
                            <a-button @click="refreshServerInfo" v-else>
                                重试
                            </a-button>
                        </template>
                    </a-result>
                </div>

                <div v-else>
                    <h1 class="page-title">服务器信息</h1>
                    <div class="status-indicator">
                        <a-tag :color="serverStatus.color" :bordered="false">
                            <template #icon>
                                <component
                                    style="
                                        height: 1em;
                                        width: 1em;
                                        line-height: 1em;
                                        text-align: center;
                                        display: inline-block;
                                        position: relative;
                                        fill: currentColor;
                                    "
                                    :is="serverStatus.icon"
                                />
                            </template>
                            {{ serverStatus.text }}
                        </a-tag>
                    </div>

                    <div class="form-item">
                        <label>服务器名称</label>
                        <a-input
                            v-model:value="serverInfo.name"
                            placeholder="输入服务器名称"
                            :maxlength="32"
                            allow-clear
                        />
                    </div>
                    <div class="form-item">
                        <label>网站链接（可留空）</label>
                        <a-input
                            v-model:value="serverInfo.link"
                            placeholder="可留空"
                            :maxlength="25"
                            allow-clear
                        />
                    </div>
                    <div class="form-item">
                        <label>服务器地址</label>
                        <a-input
                            v-model:value="serverInfo.ip"
                            placeholder="输入IP地址和端口"
                            :status="
                                serverStatus.color === 'error'
                                    ? 'error'
                                    : serverStatus.color === 'processing'
                                      ? 'warning'
                                      : ''
                            "
                            allow-clear
                        />
                    </div>
                    <div class="form-item">
                        <label>服务器版本</label>
                        <a-input
                            v-model:value="serverInfo.version"
                            placeholder="输入服务器版本（如 1.20.1）"
                            :maxlength="32"
                            allow-clear
                        />
                    </div>
                    <div class="form-item">
                        <label>服务器描述</label>
                        <MdEditor
                            v-model="serverInfo.desc"
                            editor-id="serverDesc"
                            :preview="true"
                            @on-save="manualSave"
                            noKatex
                            noMermaid
                            noUploadImg
                            class="md-editor"
                            :theme="isDarkMode ? 'dark' : 'light'"
                        />
                    </div>
                    <!-- 标签 -->
                    <div class="form-item">
                        <label>标签</label>
                        <DynamicTags v-model:value="serverInfo.tags" />
                    </div>
                    <!-- 保存按钮 -->
                    <div class="form-item" style="text-align: right">
                        <a-button
                            type="primary"
                            @click="saveServerInfo"
                            :loading="serverInfo.loading"
                        >
                            保存
                        </a-button>
                        <a-button
                            @click="clearDraft"
                            style="margin-left: 10px"
                            :disabled="!hasDraft"
                        >
                            清除草稿
                        </a-button>
                    </div>
                </div>
            </div>
        </a-spin>
    </div>
</template>

<style scoped lang="less">
@import '@/assets/css/variables.less';

.edit {
    padding: 20px;

    .content-container {
        margin: 0 auto;
        border-radius: 12px;
        img {
            max-width: 500px;
        }
    }

    .page-title {
        margin-bottom: 24px;
        font-size: 1.5rem;
        color: @text-color-light;
        @media (prefers-color-scheme: dark) {
            color: @text-color-dark;
        }
    }

    .status-indicator {
        margin-bottom: 24px;

        .a-tag {
            font-size: 0.95rem;
            padding: 8px 16px;
        }
    }

    .form-item {
        margin-bottom: 24px;

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: @text-color-secondary;
            @media (prefers-color-scheme: dark) {
                color: @text-color-secondary-dark;
            }
        }

        .md-editor {
            border-radius: 8px;
            transition: all 0.3s;
            --md-color: @text-color-light;
            @media (prefers-color-scheme: dark) {
                --md-color: @text-color-dark;
            }
        }
    }
}
</style>
