# 行为式验证码API

### 获取图形验证码

#### 路径

[POST] /generate

#### 参数

* `phone [string]` 用户的电话号码，同一个号码10秒内最多请求1次

#### 返回值

* `error [bool]` 仅当图片生成失败时返回且值为`true`，理论上不会发生

* `hash [string]` 本次请求验证码的hash值，是验证时的凭证

* `img [string]` 请求验证码的base64编码

#### 异常

* 参数中不含有`phone`字段或手机号不合法时返回`400`，消息为：`invalid argument: phone`

* 同一手机号请求过于频繁时返回`400`，消息为：`requests are too frequent`

### 获取图形验证码

#### 路径

[POST] /validate

#### 参数

* `hash [string]` 验证码的hash

* `x [string || number]` 用户移动图片的水平距离（当图片宽度等于400时）

* `y [string || number]` 用户移动图片的竖直距离（当图片高度等于300时）

#### 返回值

* `success [bool]` 验证是否通过，通过时为`true`

* `times [string || number]` 当验证失败时返回失败的累计次数

* `phone [string]` 验证通过时会返回对应的用户的手机号

#### 异常

* 参数中不含有必要的参数时返回`400`，消息为：`invalid argument`

* 对应`hash`的验证码不存在时返回`400`，消息为：`invalid verification code id`

* 验证码过期（15分钟）时返回`400`，消息为：`verification code expiration`
